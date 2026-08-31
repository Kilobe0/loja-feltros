import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../categories/category.schema';
import { Product, ProductDocument, ProductStatus } from '../products/product.schema';
import { AuthService } from '../auth/auth.service';

// Cuida só da infraestrutura mínima (admin e categorias) e, opcionalmente,
// de um produto de exemplo — nunca do catálogo real, que é gerenciado pelo
// painel admin.
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private authService: AuthService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed() {
    try {
      await this.authService.createAdmin(
        'Loja de Feltros',
        process.env.ADMIN_EMAIL || 'admin@lojafeltros.com',
        process.env.ADMIN_PASSWORD || 'admin123',
      );

      const categories = await this.seedCategories();
      await this.seedExampleProduct(categories[0]);

      this.logger.log('✅ Seed concluído com sucesso');
    } catch (err) {
      this.logger.error('Erro no seed:', err.message);
    }
  }

  private async seedCategories(): Promise<CategoryDocument[]> {
    const list = [
      { name: 'Chaveiros', slug: 'chaveiros', description: 'Chaveiros de feltro' },
      { name: 'Bonecos', slug: 'bonecos', description: 'Bonecos e brinquedos de feltro' },
      { name: 'Enfeites', slug: 'enfeites', description: 'Enfeites e decoração de feltro' },
    ];

    const docs: CategoryDocument[] = [];
    for (const cat of list) {
      let doc = await this.categoryModel.findOne({ slug: cat.slug }).exec();
      if (!doc) doc = await this.categoryModel.create(cat);
      docs.push(doc);
    }
    return docs;
  }

  // Produto de exemplo opcional, só para o catálogo não aparecer vazio no
  // primeiro acesso. A mãe do usuário pode editar ou remover pelo admin.
  private async seedExampleProduct(category: CategoryDocument): Promise<void> {
    const slug = 'chaveiro-gatinho-de-feltro';
    const existing = await this.productModel.findOne({ slug }).exec();
    if (existing) return;

    await this.productModel.create({
      title: 'Chaveiro Gatinho de Feltro',
      slug,
      description: 'Chaveiro artesanal em feltro, feito à mão.',
      attributes: 'Feltro 100% poliéster, enchimento fiberfill',
      dimensions: '8 x 6 x 2 cm',
      weight: 0.02,
      price: 25,
      quantity: 5,
      status: ProductStatus.AVAILABLE,
      featured: true,
      images: [],
      variants: [],
      category: category._id,
    });
  }
}
