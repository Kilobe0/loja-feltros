import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { Category, CategorySchema } from '../categories/category.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
