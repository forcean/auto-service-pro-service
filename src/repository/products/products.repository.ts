import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { ProductsEntity } from "./products.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(ProductsEntity.name, 'autoservice') private readonly productsEntity: Model<ProductsEntity>,
  ) { }
}