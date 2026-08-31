import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from './product.schema';

export class ProductVariantDto {
  @IsString() name: string;
  @IsString() image: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
}

// O slug não é aceito da API: é sempre derivado do título pelo serviço.
// O status também não é aceito: é sempre derivado da quantidade/variantes.
export class CreateProductDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() attributes?: string;
  @IsString() dimensions: string;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto) variants?: ProductVariantDto[];
  @IsString() category: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() attributes?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto) variants?: ProductVariantDto[];
  @IsOptional() @IsString() category?: string;
}

export class FilterProductsDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
