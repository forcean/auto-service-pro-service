import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { ProductBrandsEntity } from "./product-brands.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductBrandsRepository {
  constructor(
    @InjectModel(ProductBrandsEntity.name, 'autoservice') private readonly productBrandsEntity: Model<ProductBrandsEntity>,
  ) { }
}