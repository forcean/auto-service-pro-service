import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  ServiceHistoryDocument,
  ServiceHistoryEntity,
} from './service-history.schema';

@Injectable()
export class ServiceHistoryRepository {
  constructor(
    @InjectModel(ServiceHistoryEntity.name, 'autoservice')
    private readonly model: Model<ServiceHistoryDocument>,
  ) {}

  async create(
    payload: Record<string, unknown>,
    _user: AuthUser,
    session?: ClientSession,
  ) {
    const [history] = await this.model.create([payload], { session });
    return history;
  }

  async findByWorkOrder(workOrderId: string) {
    return this.model
      .findOne({
        workOrderId: new Types.ObjectId(workOrderId),
        isDeleted: false,
      })
      .lean();
  }
}
