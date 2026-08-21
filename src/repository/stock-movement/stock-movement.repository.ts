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
}
