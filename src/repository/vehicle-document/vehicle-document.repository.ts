import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleDocumentDocument,
  VehicleDocumentEntity,
} from './vehicle-document.schema';

@Injectable()
export class VehicleDocumentRepository {
  constructor(
    @InjectModel(VehicleDocumentEntity.name, 'autoservice')
    private readonly model: Model<VehicleDocumentDocument>,
  ) {}

  async create(payload: Record<string, unknown>) {
    return this.model.create(payload);
  }

  async findByVehicleId(vehicleId: string) {
    return this.model
      .find({
        isDeleted: false,
        // Older uploads were persisted before the schema cast was applied and
        // have vehicleId as a string. Comparing via $toString keeps those
        // documents available while also matching current ObjectId records.
        $expr: { $eq: [{ $toString: '$vehicleId' }, vehicleId] },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findContentById(vehicleId: string, documentId: string) {
    if (!Types.ObjectId.isValid(documentId)) {
      return null;
    }

    return this.model
      .findOne({
        _id: new Types.ObjectId(documentId),
        isDeleted: false,
        $expr: { $eq: [{ $toString: '$vehicleId' }, vehicleId] },
      })
      .select('+content')
      .lean();
  }

  async softDelete(vehicleId: string, documentId: string, updatedBy: string) {
    if (!Types.ObjectId.isValid(documentId)) {
      return null;
    }

    return this.model.findOneAndUpdate(
      {
        _id: new Types.ObjectId(documentId),
        isDeleted: false,
        $expr: { $eq: [{ $toString: '$vehicleId' }, vehicleId] },
      },
      { $set: { isDeleted: true, deletedBy: updatedBy, deletedAt: new Date() } },
      { new: true },
    );
  }
}
