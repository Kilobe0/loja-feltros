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
        'Aline Valença',
        process.env.ADMIN_EMAIL || 'admin@lojafeltros.com',
        process.env.ADMIN_PASSWORD || 'admin123',
      );

      const categories = await this.seedCategories();
      await this.seedExampleProducts(categories);

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

  // Produtos de exemplo opcionais, só para o catálogo não aparecer vazio no
  // primeiro acesso. A mãe do usuário pode editar ou remover pelo admin.
  private async seedExampleProducts(categories: CategoryDocument[]): Promise<void> {
    const [chaveiros, bonecos, enfeites] = categories;
    const examples = [
      {
        title: 'Chaveiro Gatinho de Feltro',
        slug: 'chaveiro-gatinho-de-feltro',
        description: 'Chaveiro artesanal em feltro, feito à mão.',
        attributes: 'Feltro 100% poliéster, enchimento fiberfill',
        dimensions: '8 x 6 x 2 cm',
        weight: 0.02,
        price: 25,
        quantity: 5,
        category: chaveiros,
      },
      {
        title: 'Chaveiro Coelhinho de Feltro',
        slug: 'chaveiro-coelhinho-de-feltro',
        description: 'Chaveiro artesanal em feltro, feito à mão.',
        attributes: 'Feltro 100% poliéster, enchimento fiberfill',
        dimensions: '8 x 7 x 2 cm',
        weight: 0.02,
        price: 25,
        quantity: 8,
        category: chaveiros,
      },
      {
        title: 'Boneca de Pano em Feltro',
        slug: 'boneca-de-pano-em-feltro',
        description: 'Boneca artesanal em feltro, feita à mão.',
        attributes: 'Feltro 100% poliéster, enchimento fiberfill',
        dimensions: '25 x 12 x 5 cm',
        weight: 0.15,
        price: 89,
        quantity: 3,
        category: bonecos,
      },
      {
        title: 'Enfeite de Porta Coração',
        slug: 'enfeite-de-porta-coracao',
        description: 'Enfeite de porta em feltro, feito à mão.',
        attributes: 'Feltro 100% poliéster, enchimento fiberfill',
        dimensions: '20 x 20 x 4 cm',
        weight: 0.1,
        price: 45,
        quantity: 6,
        category: enfeites,
      },
    ];

    for (const example of examples) {
      const existing = await this.productModel.findOne({ slug: example.slug }).exec();
      if (existing) continue;

      await this.productModel.create({
        title: example.title,
        slug: example.slug,
        description: example.description,
        attributes: example.attributes,
        dimensions: example.dimensions,
        weight: example.weight,
        price: example.price,
        quantity: example.quantity,
        status: ProductStatus.AVAILABLE,
        featured: false,
        images: [],
        variants: [],
        category: example.category._id,
      });
    }
  }
}
