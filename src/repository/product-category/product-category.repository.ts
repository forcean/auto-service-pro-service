import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { ProductCategoriesEntity } from "./product-category.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategoriesEntity.name, 'autoservice') private readonly productCategoriesEntity: Model<ProductCategoriesEntity>,
  ) { }
}