import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductStatus } from './product.schema';
import { CreateProductDto, UpdateProductDto, FilterProductsDto } from './product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAll(filters: FilterProductsDto = {}): Promise<ProductDocument[]> {
    const query: Record<string, any> = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = new Types.ObjectId(filters.category);
    return this.productModel.find(query).populate('category').sort({ createdAt: -1 }).exec();
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ slug }).populate('category').exec();
    if (!product) throw new NotFoundException(`Produto "${slug}" não encontrado`);
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).populate('category').exec();
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async findRelated(categoryId: string, excludeId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({ category: new Types.ObjectId(categoryId), _id: { $ne: new Types.ObjectId(excludeId) } })
      .populate('category')
      .limit(4)
      .exec();
  }

  async findFeatured(): Promise<ProductDocument[]> {
    return this.productModel.find({ featured: true }).populate('category').limit(6).exec();
  }

  // O slug é derivado do título ("Chaveiro Gatinho" → "chaveiro-gatinho"); em
  // caso de título repetido recebe sufixo numérico (-2, -3...) para manter a
  // URL única.
  private slugify(title: string): string {
    return (
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'produto'
    );
  }

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    for (let n = 2; ; n++) {
      const clash = await this.productModel
        .exists({
          slug,
          ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
        })
        .exec();
      if (!clash) return slug;
      slug = `${base}-${n}`;
    }
  }

  // Deriva o status a partir do estoque: com variantes, disponível se alguma
  // tiver unidades; sem variantes, disponível se a quantidade do produto for
  // maior que zero.
  private deriveStatus(product: Pick<Product, 'quantity' | 'variants'>): ProductStatus {
    const hasStock = product.variants?.length
      ? product.variants.some((v) => v.quantity > 0)
      : product.quantity > 0;
    return hasStock ? ProductStatus.AVAILABLE : ProductStatus.OUT_OF_STOCK;
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const data = {
      ...dto,
      slug: await this.uniqueSlug(dto.title),
      category: new Types.ObjectId(dto.category),
    };
    const status = this.deriveStatus({
      quantity: data.quantity ?? 1,
      variants: (data.variants ?? []) as any,
    });
    return this.productModel.create({ ...data, status });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const current = await this.productModel.findById(id).exec();
    if (!current) throw new NotFoundException('Produto não encontrado');

    const update: Record<string, any> = { ...dto };
    if (dto.category) update.category = new Types.ObjectId(dto.category);
    // Título mudou → slug acompanha.
    if (dto.title) update.slug = await this.uniqueSlug(dto.title, id);

    const quantity = dto.quantity ?? current.quantity;
    const variants = dto.variants ?? current.variants;
    update.status = this.deriveStatus({ quantity, variants: variants as any });

    const product = await this.productModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('category')
      .exec();
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Produto não encontrado');
  }

  // Reserva `qty` unidades de forma atômica ($gte evita corrida entre dois
  // pedidos disputando o mesmo estoque). Lança erro se não há unidades
  // suficientes. Quando o produto tem variantes, informe `variantName`.
  async reserve(id: string, qty: number, variantName?: string): Promise<ProductDocument> {
    if (qty <= 0) throw new BadRequestException('Quantidade inválida');

    let product: ProductDocument | null;
    if (variantName) {
      product = await this.productModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(id),
            variants: { $elemMatch: { name: variantName, quantity: { $gte: qty } } },
          },
          { $inc: { 'variants.$.quantity': -qty } },
          { new: true },
        )
        .exec();
      if (!product) throw new BadRequestException('Estoque insuficiente');
    } else {
      product = await this.productModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(id), quantity: { $gte: qty } },
          { $inc: { quantity: -qty } },
          { new: true },
        )
        .exec();
      if (!product) throw new BadRequestException('Estoque insuficiente');
    }

    product.status = this.deriveStatus(product);
    await product.save();
    return product;
  }

  // Devolve `qty` unidades ao estoque (pagamento cancelado/rejeitado/expirado).
  async release(id: string, qty: number, variantName?: string): Promise<ProductDocument> {
    if (qty <= 0) throw new BadRequestException('Quantidade inválida');

    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Produto não encontrado');

    if (variantName) {
      const variant = product.variants.find((v) => v.name === variantName);
      if (variant) variant.quantity += qty;
    } else {
      product.quantity += qty;
    }
    product.status = this.deriveStatus(product);
    await product.save();
    return product;
  }

  // Recalcula o status do produto a partir do estoque atual — usado após a
  // confirmação de pagamento (o estoque já foi decrementado na criação do
  // pedido; isto é só uma correção defensiva).
  async recomputeStatus(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Produto não encontrado');
    product.status = this.deriveStatus(product);
    await product.save();
    return product;
  }

  async seedCreate(data: Partial<Product> & { category: Types.ObjectId }): Promise<ProductDocument> {
    const existing = await this.productModel.findOne({ slug: data.slug }).exec();
    if (existing) return existing;
    return this.productModel.create(data);
  }
}
