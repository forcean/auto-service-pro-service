import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { ProductsEntity } from './products.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  createProductDto,
  getProductListDto,
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

  async getListProducts(
    param: getProductListDto,
    pagination: { page: number; limit: number; skip: number },
  ) {
    const filter = {
      ...(param.name && {
        name: { $regex: param.name, $options: 'i' },
      }),
      ...(param.sku && { sku: { $regex: param.sku, $options: 'i' } }),
      ...(param.categoryId && { categoryId: param.categoryId }),
      ...(param.brandId && { brandId: param.brandId }),
      ...(param.status && { status: param.status }),
      ...(param.isStocked !== undefined && { isStocked: param.isStocked }),
    };
    const [data, total] = await Promise.all([
      this.productsEntity
        .find(filter)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      this.productsEntity.countDocuments(filter),
    ]);

    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data,
    };
  }
  
  async deleteProductBySku(
  sku: string,
  authUser: AuthUser,
): Promise<boolean> {
  try {
    const result = await this.productsEntity.updateOne(
      {
        sku,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedDt: new Date(),
          deletedBy: authUser.publicId,
        },
      },
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting product', error);
    return false;
  }
}
}
