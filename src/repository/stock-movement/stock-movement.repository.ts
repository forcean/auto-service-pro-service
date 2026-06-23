import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { StockMovementEntity } from "./stock-movement.schema";
import { Model } from "mongoose";
import { AuthUser } from "src/types/user.type";

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectModel(
      StockMovementEntity.name,
      'autoservice',
    )
    private readonly movementModel: Model<StockMovementEntity>,
  ) {}

  async create(
    payload: Partial<StockMovementEntity>,
    user: AuthUser,
  ) {
    return this.movementModel.create({
      ...payload,
      createdBy: user.publicId,
    });
  }

  async getMovements(
    productId: string,
  ) {
    return this.movementModel
      .find({
        productId,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }
}