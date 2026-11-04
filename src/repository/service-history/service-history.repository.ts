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

  async findByVehicleId(vehicleId: string) {
    const normalizedVehicleId = new Types.ObjectId(vehicleId);

    return this.model
      .find({
        isDeleted: false,
        // New records store only the ObjectId. Older records were written
        // while the work order relation was populated, leaving the complete
        // vehicle object in this field. Keep both forms readable until the
        // historical collection is migrated.
        $or: [
          { vehicleId: normalizedVehicleId },
          { 'vehicleId._id': normalizedVehicleId },
        ],
      })
      .populate({
        path: 'workOrderId',
        select: 'advisorId internalRemark inspections',
        populate: {
          path: 'advisorId',
          select: 'firstname lastname publicId',
        },
      })
      .sort({ createdAt: -1 })
      .lean();
  }
}
