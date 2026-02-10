import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { ProductCategoriesEntity } from "./product-category.schema";
import { InjectModel } from "@nestjs/mongoose";
import { getProductCategoriesDto } from "src/routes/stock-products/products.dto";

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategoriesEntity.name, 'autoservice') private readonly productCategoriesEntity: Model<ProductCategoriesEntity>,
  ) { }

  async getProductCategories(dto: getProductCategoriesDto) {
    const query: FilterQuery<ProductCategoriesEntity> = { }

    if (dto.isActive !== undefined) {
      query.isActive = dto.isActive;
    }

    if (dto.isSelectable !== undefined) {
      query.isSelectable = dto.isSelectable;
    }
    return await this.productCategoriesEntity.find(query);
  }
}