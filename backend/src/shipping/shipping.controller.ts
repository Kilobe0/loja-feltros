import { BadRequestException, Body, Controller, Get, Post, Query, Redirect } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MelhorEnvioService, QuoteProduct, buildQuoteProduct } from './melhorenvio.service';
import { ProductsService } from '../products/products.service';

class QuoteItemDto {
  @IsString() productId: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

class QuoteDto {
  @IsString() zipTo: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items: QuoteItemDto[];
}

@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly melhorEnvio: MelhorEnvioService,
    private readonly products: ProductsService,
  ) {}

  // Passo 1 do OAuth: abrir esta rota no navegador leva à tela de autorização
  // do Melhor Envio (uma vez só, feita pelo admin).
  @Get('melhorenvio/authorize')
  @Redirect()
  authorize() {
    return { url: this.melhorEnvio.getAuthorizeUrl() };
  }

  // Passo 2: o Melhor Envio redireciona para cá com ?code=...
  @Get('melhorenvio/callback')
  async callback(@Query('code') code?: string) {
    if (!code) throw new BadRequestException('Código de autorização ausente');
    await this.melhorEnvio.exchangeCode(code);
    return 'Melhor Envio autorizado com sucesso! Pode fechar esta aba.';
  }

  @Get('status')
  async status() {
    return { authorized: await this.melhorEnvio.isAuthorized() };
  }

  // Público: cotação usada no checkout.
  @Post('quote')
  async quote(@Body() dto: QuoteDto) {
    const products: QuoteProduct[] = [];
    for (const item of dto.items) {
      const product = await this.products.findById(item.productId);
      products.push(buildQuoteProduct(product, item.quantity ?? 1));
    }
    return this.melhorEnvio.calculate(dto.zipTo, products);
  }
}
