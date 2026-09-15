import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { StockMovementEntity } from './stock-movement.schema';
import { ClientSession, Model } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  CreateStockMovementDto,
  getMovementListDto,
} from 'src/routes/stock-management/dtos/stock-management.dto';

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectModel(StockMovementEntity.name, 'autoservice')
    private readonly movementModel: Model<StockMovementEntity>,
  ) {}

  async createStockMovement(
    payload: CreateStockMovementDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.movementModel.create(
      [
        {
          ...payload,
          createdBy: user.publicId,
        },
      ],
      { session },
    );
  }

  async getMovements(productId: string) {
    return this.movementModel
      .find({
        productId,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async getListMovements(
    param: getMovementListDto,
    pagination: { page: number; limit: number; skip: number },
  ) {
    const filter = {
      ...(param.productId && {
        productId: { $regex: param.productId, $options: 'i' },
      }),
      ...(param.sku && { sku: { $regex: param.sku, $options: 'i' } }),
      ...(param.movementType && { movementType: param.movementType }),
      ...(param.referenceType && { referenceType: param.referenceType }),
    };
    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      this.movementModel.countDocuments(filter),
    ]);

    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data,
    };
  }

  async getMovementSummary() {
    const [summary] = await this.movementModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          receive: {
            $sum: { $cond: [{ $eq: ['$movementType', 'RECEIVE'] }, 1, 0] },
          },
          issue: {
            $sum: { $cond: [{ $eq: ['$movementType', 'ISSUE'] }, 1, 0] },
          },
          adjust: {
            $sum: { $cond: [{ $eq: ['$movementType', 'ADJUST'] }, 1, 0] },
          },
          return: {
            $sum: { $cond: [{ $eq: ['$movementType', 'RETURN'] }, 1, 0] },
          },
          reserve: {
            $sum: { $cond: [{ $eq: ['$movementType', 'RESERVE'] }, 1, 0] },
          },
          release: {
            $sum: { $cond: [{ $eq: ['$movementType', 'RELEASE'] }, 1, 0] },
          },
          in: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$movementType', 'RECEIVE'] },
                    { $eq: ['$movementType', 'RETURN'] },
                    {
                      $and: [
                        { $eq: ['$movementType', 'ADJUST'] },
                        { $gt: ['$afterQty', '$beforeQty'] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          out: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$movementType', 'ISSUE'] },
                    {
                      $and: [
                        { $eq: ['$movementType', 'ADJUST'] },
                        { $lt: ['$afterQty', '$beforeQty'] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          receive: 1,
          issue: 1,
          adjust: 1,
          return: 1,
          reserve: 1,
          release: 1,
          in: 1,
          out: 1,
        },
      },
    ]);

    return summary ?? {
      total: 0,
      receive: 0,
      issue: 0,
      adjust: 0,
      return: 0,
      reserve: 0,
      release: 0,
      in: 0,
      out: 0,
    };
  }
}
