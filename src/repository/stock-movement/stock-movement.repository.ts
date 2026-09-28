import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { StockMovementEntity } from './stock-movement.schema';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  CreateStockMovementDto,
  getMovementListDto,
} from 'src/routes/stock-management/dtos/stock-management.dto';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { ProductsEntity } from '../products/products.schema';

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

  async getMovements(productId: string, limit = 10) {
    return this.movementModel
      .find({
        productId,
      })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async getListMovements(
    param: getMovementListDto,
    pagination: { page: number; limit: number; skip: number },
    sortBy: SortCriterial | null,
  ) {
    const filter: FilterQuery<StockMovementEntity> = {};

    if (param.productId) {
      filter.productId = new Types.ObjectId(param.productId);
    }

    if (param.sku) {
      filter.sku = this.caseInsensitiveRegex(param.sku);
    }

    if (param.movementType) {
      filter.movementType = param.movementType;
    }

    if (param.referenceType) {
      filter.referenceType = param.referenceType;
    }

    if (param.referenceId) {
      filter.referenceId = this.caseInsensitiveRegex(param.referenceId);
    }

    if (param.createdBy) {
      filter.createdBy = param.createdBy;
    }

    if (param.keyword) {
      const keyword = this.caseInsensitiveRegex(param.keyword);
      filter.$or = [
        { sku: keyword },
        { referenceId: keyword },
        { createdBy: keyword },
      ];
    }

    if (param.startDate || param.endDate) {
      const createdAt: Record<string, Date> = {};

      if (param.startDate) {
        createdAt.$gte = this.startOfBangkokDay(param.startDate);
      }

      if (param.endDate) {
        const endExclusive = this.startOfBangkokDay(param.endDate);
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
        createdAt.$lt = endExclusive;
      }

      filter.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .populate({
          path: 'productId',
          model: ProductsEntity.name,
          select: '_id name',
        })
        .sort(this.getSafeSort(sortBy))
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
      data: data.map((movement) => this.toListItem(movement)),
    };
  }

  private caseInsensitiveRegex(value: string): RegExp {
    return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  private startOfBangkokDay(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000+07:00`);
  }

  private getSafeSort(sortBy: SortCriterial | null): Record<string, 1 | -1> {
    const allowedFields = new Set([
      'createdAt',
      'movementType',
      'sku',
      'referenceId',
      'quantity',
      'afterQty',
      'createdBy',
    ]);
    const safeSort = Object.entries(sortBy ?? {}).reduce<
      Record<string, 1 | -1>
    >((result, [field, direction]) => {
      if (allowedFields.has(field)) {
        result[field] = direction === 'asc' ? 1 : -1;
      }

      return result;
    }, {});

    return Object.keys(safeSort).length ? safeSort : { createdAt: -1 };
  }

  private toListItem(movement: any) {
    const product =
      movement.productId && typeof movement.productId === 'object'
        ? movement.productId
        : undefined;
    const productId = product?._id ?? movement.productId;

    return {
      ...movement,
      id: movement._id?.toString(),
      productId: productId?.toString(),
      productName: product?.name ?? movement.sku,
      direction: this.getDirection(
        movement.movementType,
        movement.beforeQty,
        movement.afterQty,
      ),
    };
  }

  private getDirection(
    movementType: string,
    beforeQty: number,
    afterQty: number,
  ): 'IN' | 'OUT' | 'ADJUST' {
    if (['RECEIVE', 'RETURN', 'TRANSFER_IN'].includes(movementType)) {
      return 'IN';
    }

    if (['ISSUE', 'TRANSFER_OUT'].includes(movementType)) {
      return 'OUT';
    }

    if (movementType === 'ADJUST') {
      return afterQty > beforeQty
        ? 'IN'
        : afterQty < beforeQty
          ? 'OUT'
          : 'ADJUST';
    }

    return 'ADJUST';
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
