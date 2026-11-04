import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { ProductBrandsEntity } from "./product-brands.schema";
import { InjectModel } from "@nestjs/mongoose";
import { AuthUser } from "src/types/user.type";

@Injectable()
export class ProductBrandsRepository {
  constructor(
    @InjectModel(ProductBrandsEntity.name, 'autoservice') private readonly productBrandsEntity: Model<ProductBrandsEntity>,
  ) { }

  async getProductBrands(isActive?: boolean) {
    const query: FilterQuery<ProductBrandsEntity> = {
      isDeleted: { $ne: true },
    };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.productBrandsEntity.find(query).sort({ name: 1 });
  };

  async getBrandById(brandId: string) {
    const query: FilterQuery<ProductBrandsEntity> = {
      _id: brandId,
      isDeleted: { $ne: true },
    };
    return await this.productBrandsEntity.findOne(query);
  }

  async getBrandByCode(code: string) {
    return this.productBrandsEntity.findOne({
      code,
      isDeleted: { $ne: true },
    });
  }

  async createBrand(
    payload: Partial<ProductBrandsEntity>,
    authUser: AuthUser,
  ) {
    const brand = new this.productBrandsEntity({
      ...payload,
      createdBy: authUser.publicId,
      createdDt: new Date(),
      updatedBy: authUser.publicId,
      updatedDt: new Date(),
      isDeleted: false,
    });

    return brand.save();
  }

  async updateBrand(
    brandId: string,
    payload: Partial<ProductBrandsEntity>,
    authUser: AuthUser,
  ) {
    const result = await this.productBrandsEntity.updateOne(
      { _id: brandId, isDeleted: { $ne: true } },
      {
        $set: {
          ...payload,
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
    );

    return result.matchedCount > 0;
  }
}
