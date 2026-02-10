import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { ProductsEntity } from "./products.schema";
import { InjectModel } from "@nestjs/mongoose";
import { createProductDto } from "src/routes/stock-products/products.dto";

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(ProductsEntity.name, 'autoservice') private readonly productsEntity: Model<ProductsEntity>,
  ) { }

  async getProductBySku(sku: string) {
    const query: FilterQuery<ProductsEntity> = { sku: sku };
    return await this.productsEntity.findOne(query);
  }

  async createProduct(productData: createProductDto, userId: string): Promise<boolean> {
    try {
      await this.productsEntity.create({
        sku: productData.sku,
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
        isDeleted: productData.isDeleted,
        createdBy: userId,
        createdDt: new Date(),
      });
      return true;
    }
    catch (error) {
      console.error('Error created product', error);
      return false;
    }
  }
}