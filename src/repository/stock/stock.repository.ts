import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';

import { AuthUser } from 'src/types/user.type';
import { StockEntity } from './stock.schema';
import { createStockDto } from 'src/routes/stock-management/dtos/stock-management.dto';

@Injectable()
export class StocksRepository {
  constructor(
    @InjectModel(StockEntity.name, 'autoservice')
    private readonly stockModel: Model<StockEntity>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.stockModel.db.startSession();
  }

  async createStock(
    payload: createStockDto,
    authUser: AuthUser,
  ): Promise<StockEntity> {
    const stock = new this.stockModel({
      productId: new Types.ObjectId(payload.productId),

      warehouseId: payload.warehouseId
        ? new Types.ObjectId(payload.warehouseId)
        : null,

      createdBy: authUser.publicId,
      createdDt: new Date(),

      updatedBy: authUser.publicId,
      updatedDt: new Date(),

      isDeleted: false,
    });

    return stock.save();
  }

  async getById(id: string): Promise<StockEntity | null> {
    return this.stockModel
      .findOne({
        _id: id,
        isDeleted: { $ne: true },
      })
      .lean()
      .exec();
  }

  async getByProductId(productId: string): Promise<StockEntity | null> {
    return this.stockModel
      .findOne({
        productId,
        isDeleted: { $ne: true },
      })
      .lean()
      .exec();
  }

  async getBySku(sku: string): Promise<StockEntity | null> {
    return this.stockModel
      .findOne({
        sku,
        isDeleted: { $ne: true },
      })
      .lean()
      .exec();
  }

  async existsByProductId(productId: string): Promise<boolean> {
    const count = await this.stockModel.countDocuments({
      productId,
      isDeleted: { $ne: true },
    });

    return count > 0;
  }

  async existsBySku(sku: string): Promise<boolean> {
    const count = await this.stockModel.countDocuments({
      sku,
      isDeleted: { $ne: true },
    });

    return count > 0;
  }

  async getStocks(filter: FilterQuery<StockEntity>, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = {
      ...filter,
      isDeleted: { $ne: true },
    };
    const [data, total] = await Promise.all([
      this.stockModel
        .find(query)
        .sort({
          updatedDt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.stockModel.countDocuments(query),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async updateByProductId(
    productId: string,
    updateData: Partial<StockEntity>,
    authUser: AuthUser,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        isDeleted: {
          $ne: true,
        },
      },
      {
        $set: {
          ...updateData,
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
      { session },
    );

    return result.modifiedCount > 0;
  }

  async increaseStock(
    productId: string,
    quantity: number,
    authUser: AuthUser,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        isDeleted: {
          $ne: true,
        },
      },
      {
        $inc: {
          quantity,
        },
        $set: {
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
      { session },
    );

    return result.modifiedCount > 0;
  }

  async decreaseStock(
    productId: string,
    quantity: number,
    authUser: AuthUser,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        quantity: {
          $gte: quantity,
        },
        isDeleted: {
          $ne: true,
        },
      },
      {
        $inc: {
          quantity: -quantity,
        },
        $set: {
          updatedBy: authUser.publicId,

          updatedDt: new Date(),
        },
      },
      { session },
    );

    return result.modifiedCount > 0;
  }

  async increaseReserved(
    productId: string,
    quantity: number,
    authUser: AuthUser,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        isDeleted: {
          $ne: true,
        },
      },
      {
        $inc: {
          reserved: quantity,
        },
        $set: {
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
      { session },
    );

    return result.modifiedCount > 0;
  }

  async decreaseReserved(
    productId: string,
    quantity: number,
    authUser: AuthUser,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        reserved: {
          $gte: quantity,
        },
        isDeleted: {
          $ne: true,
        },
      },
      {
        $inc: {
          reserved: -quantity,
        },
        $set: {
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
      { session },
    );

    return result.modifiedCount > 0;
  }

  async softDelete(productId: string, authUser: AuthUser): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        isDeleted: {
          $ne: true,
        },
      },
      {
        $set: {
          isDeleted: true,
          deletedBy: authUser.publicId,
          deletedDt: new Date(),
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async restore(productId: string, authUser: AuthUser): Promise<boolean> {
    const result = await this.stockModel.updateOne(
      {
        productId,
        isDeleted: true,
      },
      {
        $set: {
          isDeleted: false,
          updatedBy: authUser.publicId,
          updatedDt: new Date(),
        },
        $unset: {
          deletedBy: 1,
          deletedDt: 1,
        },
      },
    );

    return result.modifiedCount > 0;
  }
}
