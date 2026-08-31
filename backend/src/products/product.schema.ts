import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

// Estoque por unidades (não peça única): o produto fica AVAILABLE enquanto
// houver alguma unidade — do produto em si ou de alguma variante — e vira
// OUT_OF_STOCK quando zera. É sempre derivado da quantidade, nunca escolhido
// manualmente no admin.
export enum ProductStatus {
  AVAILABLE = 'AVAILABLE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

// Variante de um produto (ex.: cor, tamanho). Cada variante tem seu próprio
// estoque em unidades — diferente de obra de arte, aqui não é status binário.
@Schema({ _id: false })
export class ProductVariant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  image: string;

  @Prop({ default: 0, min: 0 })
  quantity: number;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  // Campo genérico opcional (ex.: "Feltro 100% poliéster, enchimento fiberfill").
  // Substitui o `material` obrigatório do catálogo de obras de arte.
  @Prop()
  attributes?: string;

  @Prop({ required: true })
  dimensions: string;

  // Peso em kg (usado no cálculo de frete).
  @Prop({ min: 0 })
  weight: number;

  @Prop({ required: true })
  price: number;

  // Unidades em estoque. Ignorado quando o produto tem variantes — nesse
  // caso o estoque vem da soma das variantes.
  @Prop({ default: 1, min: 0 })
  quantity: number;

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.AVAILABLE })
  status: ProductStatus;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
