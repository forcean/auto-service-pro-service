import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { WorkOrderEntity } from 'src/repository/work-order/work-order.schema';
import { CustomersVehicleEntity } from 'src/repository/customers-vehicle/customers-vehicle.schema';

export type WarrantyClaimDocument = HydratedDocument<WarrantyClaimEntity>;
export type WarrantyClaimStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'CLOSED';

@Schema({ timestamps: true, collection: 'warranty_claims' })
export class WarrantyClaimEntity {
  @Prop({ required: true, unique: true, index: true })
  claimNo!: string;

  @Prop({ type: Types.ObjectId, ref: WorkOrderEntity.name, required: true, index: true })
  originalWorkOrderId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  originalWorkOrderNo!: string;

  @Prop({ type: Types.ObjectId, ref: CustomersVehicleEntity.name, required: true, index: true })
  vehicleId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, min: 1, default: 90 })
  warrantyDays!: number;

  @Prop({ required: true })
  warrantyExpiresAt!: Date;

  @Prop({ required: true, default: true })
  isWithinWarranty!: boolean;

  @Prop({ type: String, enum: ['OPEN', 'APPROVED', 'REJECTED', 'CLOSED'], default: 'OPEN', index: true })
  status!: WarrantyClaimStatus;

  @Prop()
  followUpWorkOrderNo?: string;

  @Prop({ type: Types.ObjectId, ref: WorkOrderEntity.name })
  followUpWorkOrderId?: Types.ObjectId;

  @Prop()
  reviewedBy?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  closedBy?: string;

  @Prop()
  closedAt?: Date;

  @Prop({ required: true })
  createdBy!: string;
}

export const WarrantyClaimSchema = SchemaFactory.createForClass(WarrantyClaimEntity);
WarrantyClaimSchema.index({ status: 1, createdAt: -1 });
