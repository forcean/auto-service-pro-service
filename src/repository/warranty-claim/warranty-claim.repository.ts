import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuthUser } from 'src/types/user.type';
import {
  WarrantyClaimDocument,
  WarrantyClaimEntity,
  WarrantyClaimStatus,
} from './warranty-claim.schema';

type CreateClaimPayload = {
  claimNo: string;
  originalWorkOrderId: unknown;
  originalWorkOrderNo: string;
  vehicleId: unknown;
  description: string;
  warrantyDays: number;
  warrantyExpiresAt: Date;
  isWithinWarranty: boolean;
};

@Injectable()
export class WarrantyClaimRepository {
  constructor(
    @InjectModel(WarrantyClaimEntity.name, 'autoservice')
    private readonly model: Model<WarrantyClaimDocument>,
  ) {}

  async create(payload: CreateClaimPayload, user: AuthUser) {
    const claim = await this.model.create({ ...payload, createdBy: user.publicId });
    return claim.toObject();
  }

  findById(id: string) {
    return this.model.findById(id).lean();
  }

  findAll(status?: WarrantyClaimStatus) {
    return this.model.find(status ? { status } : {}).sort({ createdAt: -1 }).lean();
  }

  approve(id: string, followUpWorkOrderNo: string, followUpWorkOrderId: string, user: AuthUser) {
    return this.model.findOneAndUpdate(
      { _id: id, status: 'OPEN' },
      {
        $set: {
          status: 'APPROVED',
          followUpWorkOrderNo,
          followUpWorkOrderId,
          reviewedBy: user.publicId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).lean();
  }

  reject(id: string, rejectionReason: string, user: AuthUser) {
    return this.model.findOneAndUpdate(
      { _id: id, status: 'OPEN' },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason,
          reviewedBy: user.publicId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).lean();
  }

  close(id: string, user: AuthUser) {
    return this.model.findOneAndUpdate(
      { _id: id, status: 'APPROVED' },
      { $set: { status: 'CLOSED', closedBy: user.publicId, closedAt: new Date() } },
      { new: true },
    ).lean();
  }
}
