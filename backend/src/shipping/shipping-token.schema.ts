import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingTokenDocument = ShippingToken & Document;

// Documento único por provedor: guarda o token OAuth do Melhor Envio
// (access token expira em ~30 dias; o refresh token renova sem novo login).
@Schema({ timestamps: true })
export class ShippingToken {
  @Prop({ required: true, unique: true })
  provider: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop()
  refreshToken: string;

  @Prop()
  expiresAt: Date;
}

export const ShippingTokenSchema = SchemaFactory.createForClass(ShippingToken);
