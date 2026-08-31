import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';

// Wrapper fino do SDK do Mercado Pago, sem dependências de outros módulos —
// assim OrdersModule pode importá-lo sem criar dependência circular.
@Module({
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentsModule {}
