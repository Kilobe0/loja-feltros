import {
  Controller, Get, Post, Delete, Body, Param, Query, HttpCode, UseGuards,
  Headers, Req, UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MelhorEnvioService } from '../shipping/melhorenvio.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly melhorEnvio: MelhorEnvioService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // Webhook do Mercado Pago — público. Aceita o formato novo (type/data.id)
  // e o legado (topic/id), via query string ou body.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Query() query: Record<string, string>,
    @Body() body: any,
  ) {
    const type = query.type || query.topic || body?.type;
    const paymentId = query['data.id'] || query.id || body?.data?.id;
    if (type === 'payment' && paymentId) {
      await this.ordersService.handleWebhook(String(paymentId));
    }
    return { received: true };
  }

  // Webhook do Melhor Envio (rastreio) — público, mas autenticado pela
  // assinatura HMAC do corpo cru (X-ME-Signature). Registrado no painel do
  // Melhor Envio (Integrações → Área Dev.) apontando para esta rota.
  @Post('melhorenvio/webhook')
  @HttpCode(200)
  async shippingWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-me-signature') signature: string | undefined,
    @Body() body: any,
  ) {
    if (!this.melhorEnvio.isValidWebhookSignature(req.rawBody, signature)) {
      throw new UnauthorizedException('Assinatura inválida');
    }
    if (body?.event && body?.data) {
      await this.ordersService.handleShippingWebhook(String(body.event), body.data);
    }
    return { received: true };
  }

  // Admin: compra a etiqueta do Melhor Envio para um pedido pago (debita a
  // carteira de verdade — sempre disparada manualmente pelo painel).
  @Post(':id/shipment')
  @UseGuards(JwtAuthGuard)
  buyShipment(@Param('id') id: string) {
    return this.ordersService.buyShipment(id);
  }

  // Admin: reconsulta etiqueta/rastreio de um envio já comprado.
  @Post(':id/shipment/refresh')
  @UseGuards(JwtAuthGuard)
  refreshShipment(@Param('id') id: string) {
    return this.ordersService.refreshShipment(id);
  }

  // Público: só o status, sem dados do cliente. A página de retorno do
  // checkout faz polling aqui até o webhook confirmar o Pix/boleto.
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.ordersService.getPublicStatus(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
