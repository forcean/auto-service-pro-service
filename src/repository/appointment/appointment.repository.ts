import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuthUser } from 'src/types/user.type';
import {
  AppointmentDocument,
  AppointmentEntity,
  AppointmentStatus,
  AppointmentType,
} from './appointment.schema';

type AppointmentPayload = {
  customerName: string;
  phoneNumber: string;
  licensePlate?: string;
  province?: string;
  serviceType: string;
  appointmentType: AppointmentType;
  appointmentAt: Date;
  durationMinutes: number;
  notificationStatus: string;
  note?: string;
};

type AppointmentUpdatePayload = Partial<
  AppointmentPayload & {
    status: AppointmentStatus;
    notifiedAt: Date;
    notifiedBy: string;
  }
>;

@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectModel(AppointmentEntity.name, 'autoservice')
    private readonly model: Model<AppointmentDocument>,
  ) {}

  async findInRange(from: Date, to: Date) {
    return this.model
      .find({ appointmentAt: { $gte: from, $lt: to } })
      .sort({ appointmentAt: 1, createdAt: 1 })
      .lean();
  }

  async findById(id: string) {
    return this.model.findById(id).lean();
  }

  async create(payload: AppointmentPayload, user: AuthUser) {
    const appointment = await this.model.create({
      ...payload,
      createdBy: user.publicId,
      updatedBy: user.publicId,
      status: 'BOOKED',
      ...(payload.notificationStatus !== 'NOT_NOTIFIED'
        ? { notifiedAt: new Date(), notifiedBy: user.publicId }
        : {}),
    });
    return appointment.toObject();
  }

  async update(
    id: string,
    payload: AppointmentUpdatePayload,
    user: AuthUser,
  ) {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: { ...payload, updatedBy: user.publicId } },
        { new: true },
      )
      .lean();
  }

  async checkIn(
    id: string,
    queueDate: string,
    queueNumber: number,
    user: AuthUser,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          // Keep the transition atomic: a second receptionist must not replace
          // the first queue number if they click check-in at the same time.
          status: 'BOOKED',
        },
        {
          $set: {
            status: 'CHECKED_IN',
            queueDate,
            queueNumber,
            checkInAt: new Date(),
            updatedBy: user.publicId,
          },
        },
        { new: true },
      )
      .lean();
  }
}
