import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const APPOINTMENT_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  'CUSTOMER_APPOINTMENT',
  'VEHICLE_DROPOFF',
  'VEHICLE_PICKUP',
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_NOTIFICATION_STATUSES = [
  'NOT_NOTIFIED',
  'CALLED',
  'MESSAGE_SENT',
] as const;

export type AppointmentNotificationStatus =
  (typeof APPOINTMENT_NOTIFICATION_STATUSES)[number];

export type AppointmentDocument = HydratedDocument<AppointmentEntity>;

@Schema({
  timestamps: true,
  collection: 'appointments',
})
export class AppointmentEntity {
  @Prop({ required: true, trim: true })
  customerName!: string;

  @Prop({ required: true, trim: true })
  phoneNumber!: string;

  @Prop({ trim: true })
  licensePlate?: string;

  @Prop({ trim: true })
  province?: string;

  @Prop({ required: true, trim: true })
  serviceType!: string;

  /** The calendar purpose; legacy records default to the original drop-off flow. */
  @Prop({
    type: String,
    enum: APPOINTMENT_TYPES,
    default: 'VEHICLE_DROPOFF',
    required: true,
    index: true,
  })
  appointmentType!: AppointmentType;

  @Prop({ required: true, type: Date, index: true })
  appointmentAt!: Date;

  @Prop({ required: true, min: 15, default: 30 })
  durationMinutes!: number;

  @Prop({ type: String, enum: APPOINTMENT_STATUSES, default: 'BOOKED', index: true })
  status!: AppointmentStatus;

  @Prop({
    type: String,
    enum: APPOINTMENT_NOTIFICATION_STATUSES,
    default: 'NOT_NOTIFIED',
  })
  notificationStatus!: AppointmentNotificationStatus;

  @Prop({ type: Date })
  notifiedAt?: Date;

  @Prop({ trim: true })
  notifiedBy?: string;

  /** Calendar day in Asia/Bangkok on which the vehicle was actually checked in. */
  @Prop({ type: String, index: true })
  queueDate?: string;

  @Prop({ type: Number, min: 1 })
  queueNumber?: number;

  @Prop({ type: Date })
  checkInAt?: Date;

  @Prop({ trim: true })
  note?: string;

  @Prop({ required: true, type: String })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(AppointmentEntity);

AppointmentSchema.index({ appointmentAt: 1, appointmentType: 1, status: 1 });
// Sparse keeps appointments that have not checked in out of this uniqueness rule.
AppointmentSchema.index(
  { queueDate: 1, queueNumber: 1 },
  { unique: true, sparse: true },
);
