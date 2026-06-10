import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { ProductsEntity } from './products.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  createProductDto,
  updateProductDto,
} from 'src/routes/stock-products/products.dto';
import { AuthUser } from 'src/types/user.type';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(ProductsEntity.name, 'autoservice')
    private readonly productsEntity: Model<ProductsEntity>,
  ) {}

  async getProductBySku(sku: string) {
    const query: FilterQuery<ProductsEntity> = { sku: sku };
    return await this.productsEntity.findOne(query);
  }

  async createProduct(
    key: string,
    productData: createProductDto,
    user: AuthUser,
  ): Promise<boolean> {
    try {
      await this.productsEntity.create({
        sku: key,
        name: productData.name,
        description: productData.description,
        categoryId: productData.categoryId,
        categoryPath: productData.categoryPath,
        brandId: productData.brandId,
        vehicles: productData.vehicles,
        price: productData.price,
        spec: productData.spec,
        media: productData.images,
        status: productData.status,
        isDeleted: false,
        createdBy: user.publicId,
        createdDt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error created product', error);
      return false;
    }
  }

  async updateProductBySku(
    sku: string,
    updateData: updateProductDto,
    user: AuthUser,
  ) {
    return await this.productsEntity.updateOne(
      { sku: sku },
      {
        $set: {
          ...updateData,
          updatedBy: user.publicId,
          updatedDt: new Date(),
        },
      },
    );
  }
}
