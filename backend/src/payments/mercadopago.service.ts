import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePreferenceInput {
  orderId: string;
  items: PreferenceItem[];
  payer?: { name?: string; email?: string };
}

// Validade do link de pagamento. Precisa ser MENOR que o prazo em que o
// backend libera reservas de pedidos pendentes (orders.service), para que
// ninguém consiga pagar um produto que já voltou ao estoque disponível.
export const PREFERENCE_TTL_MS = 30 * 60 * 1000;

export interface PaymentInfo {
  id: string;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded
  externalReference: string | null;
  paymentTypeId: string | null; // account_money | credit_card | debit_card | bank_transfer | ticket
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig;

  constructor() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      this.logger.warn('MP_ACCESS_TOKEN não definido — pagamentos vão falhar.');
    }
    this.client = new MercadoPagoConfig({ accessToken: accessToken ?? '' });
  }

  // Cria a preference do Checkout Pro e devolve a URL de redirect (init_point).
  async createPreference(input: CreatePreferenceInput): Promise<{ id: string; initPoint: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const publicApiUrl = process.env.PUBLIC_API_URL; // ex.: https://loja-feltros-api.fly.dev
    const isHttps = (u?: string) => !!u && u.startsWith('https://');

    // Página de retorno do checkout. Env própria — não dá para derivar de
    // FRONTEND_URL, que é só a origem usada no CORS (pode ter basePath).
    const returnUrl =
      process.env.CHECKOUT_RETURN_URL || `${frontendUrl}/checkout/retorno`;
    const backUrls = { success: returnUrl, failure: returnUrl, pending: returnUrl };

    try {
      const preference = new Preference(this.client);
      const result = await preference.create({
        body: {
          items: input.items.map((it, i) => ({
            id: String(i),
            title: it.title,
            quantity: it.quantity,
            unit_price: it.unit_price,
            currency_id: 'BRL',
          })),
          external_reference: input.orderId,
          payer: input.payer?.email
            ? { name: input.payer.name, email: input.payer.email }
            : undefined,
          back_urls: backUrls,
          // Link expira junto com a reserva do estoque (ver PREFERENCE_TTL_MS).
          expires: true,
          expiration_date_to: new Date(Date.now() + PREFERENCE_TTL_MS).toISOString(),
          // auto_return e notification_url exigem URLs https públicas;
          // em localhost o MP rejeita a criação, então só enviamos quando válidas.
          ...(isHttps(returnUrl) ? { auto_return: 'approved' as const } : {}),
          ...(isHttps(publicApiUrl)
            ? { notification_url: `${publicApiUrl}/orders/webhook` }
            : {}),
        },
      });

      if (!result.id || !result.init_point) {
        throw new Error('Preference criada sem id/init_point');
      }
      return { id: result.id, initPoint: result.init_point };
    } catch (err) {
      this.logger.error('Falha ao criar preference no Mercado Pago', err as Error);
      throw new InternalServerErrorException('Não foi possível iniciar o pagamento');
    }
  }

  // Consulta um pagamento (usado no webhook para saber o status real).
  async getPayment(paymentId: string): Promise<PaymentInfo> {
    const payment = new Payment(this.client);
    const result = await payment.get({ id: paymentId });
    return {
      id: String(result.id),
      status: result.status ?? 'unknown',
      externalReference: result.external_reference ?? null,
      paymentTypeId: result.payment_type_id ?? null,
    };
  }
}
