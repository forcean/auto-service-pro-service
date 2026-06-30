import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model } from 'mongoose';
import { ProductsEntity } from './products.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  createProductDto,
  getProductListDto,
  updateProductDto,
} from 'src/routes/products/products.dto';
import { AuthUser } from 'src/types/user.type';
import {
  ICreateProductResponse,
  IProduct,
} from 'src/routes/products/interfaces/products.interface';
import { mapMongoId } from 'src/common/helper/mongo.helper';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(ProductsEntity.name, 'autoservice')
    private readonly productsEntity: Model<ProductsEntity>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.productsEntity.db.startSession();
  }

  async getProductBySku(sku: string): Promise<IProduct | null> {
    const product = await this.productsEntity.findOne({ sku:sku }).lean().exec();

    if (!product) {
      return null;
    }
    return mapMongoId(product);
  }

  async createProduct(
    key: string,
    productData: createProductDto,
    user: AuthUser,
    session?: ClientSession,
  ): Promise<ICreateProductResponse | undefined> {
    try {
      const [created] = await this.productsEntity.create(
        [
          {
            ...productData,
            sku: key,
            media: productData.images,
            isDeleted: false,
            createdBy: user.publicId,
            createdDt: new Date(),
            updatedBy: user.publicId,
            updatedDt: new Date(),
          },
        ],
        {
          session,
        },
      );

      return mapMongoId(created.toObject());
    } catch (error) {
      console.error('Error created product', error);
      throw error;
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

  async deleteProductBySku(sku: string, authUser: AuthUser): Promise<boolean> {
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
