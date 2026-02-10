import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { ProductBrandsEntity } from "./product-brands.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductBrandsRepository {
  constructor(
    @InjectModel(ProductBrandsEntity.name, 'autoservice') private readonly productBrandsEntity: Model<ProductBrandsEntity>,
  ) { }

  async getProductBrands(isActive?: boolean) {
    const query: FilterQuery<ProductBrandsEntity> = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.productBrandsEntity.find(query);
    };
  }