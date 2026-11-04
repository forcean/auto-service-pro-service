import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { ProductCategoriesEntity } from "./product-category.schema";
import { InjectModel } from "@nestjs/mongoose";
import { getProductCategoriesDto } from "src/routes/products/products.dto";
import { AuthUser } from "src/types/user.type";

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategoriesEntity.name, 'autoservice') private readonly productCategoriesEntity: Model<ProductCategoriesEntity>,
  ) { }

  async getProductCategories(dto: getProductCategoriesDto) {
    const query: FilterQuery<ProductCategoriesEntity> = {
      isDeleted: { $ne: true },
    };

    if (dto.isActive !== undefined) {
      query.isActive = dto.isActive;
    }

    if (dto.isSelectable !== undefined) {
      query.isSelectable = dto.isSelectable;
    }
    return await this.productCategoriesEntity
      .find(query)
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();
  }

  async getCategoryById(categoryId: string) {
    const query: FilterQuery<ProductCategoriesEntity> = {
      _id: categoryId,
      isDeleted: { $ne: true },
    };
    return await this.productCategoriesEntity.findOne(query);
  }

  async getCategoryByCode(code: string) {
    return this.productCategoriesEntity.findOne({
      code,
      isDeleted: { $ne: true },
    });
  }

  async getCategoriesByIds(categoryIds: string[]) {
    return this.productCategoriesEntity.find({
      _id: { $in: categoryIds },
      isDeleted: { $ne: true },
    });
  }

  async getNextSortOrder(parentId: string | null) {
    const lastCategory = await this.productCategoriesEntity
      .findOne({
        parentId,
        isDeleted: { $ne: true },
      })
      .sort({ sortOrder: -1 })
      .select({ sortOrder: 1 })
      .lean();

    return (lastCategory?.sortOrder ?? -1) + 1;
  }

  async createCategory(
    payload: Partial<ProductCategoriesEntity>,
    authUser: AuthUser,
  ) {
    const category = new this.productCategoriesEntity({
      ...payload,
      createdBy: authUser.publicId,
      createdDt: new Date(),
      updatedBy: authUser.publicId,
      updatedDt: new Date(),
      isDeleted: false,
    });

    return category.save();
  }

  async updateCategory(
    categoryId: string,
    payload: Partial<ProductCategoriesEntity>,
    authUser: AuthUser,
  ) {
    const result = await this.productCategoriesEntity.updateOne(
      { _id: categoryId, isDeleted: { $ne: true } },
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

  async updateSortOrders(categoryIds: string[], authUser: AuthUser) {
    const now = new Date();
    await this.productCategoriesEntity.bulkWrite(
      categoryIds.map((categoryId, sortOrder) => ({
        updateOne: {
          filter: { _id: categoryId, isDeleted: { $ne: true } },
          update: {
            $set: {
              sortOrder,
              updatedBy: authUser.publicId,
              updatedDt: now,
            },
          },
        },
      })),
    );
  }
}
