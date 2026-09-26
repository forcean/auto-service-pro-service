import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WorkOrderEntity } from '../work-order/work-order.schema';
import {
  EPaymentMethod,
  EWorkOrderPaymentType,
} from 'src/routes/billing/enums/billing.enum';

export type WorkOrderPaymentDocument = HydratedDocument<WorkOrderPaymentEntity>;

@Schema({ timestamps: true, collection: 'work_order_payments' })
export class WorkOrderPaymentEntity {
  @Prop({ required: true, unique: true, index: true })
  paymentNo!: string;

  @Prop({ type: Types.ObjectId, ref: WorkOrderEntity.name, required: true, index: true })
  workOrderId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  workOrderNo!: string;

  @Prop({ enum: EWorkOrderPaymentType, required: true })
  type!: EWorkOrderPaymentType;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ default: 0, min: 0 })
  allocatedAmount!: number;

  @Prop({ enum: EPaymentMethod, required: true })
  method!: EPaymentMethod;

  @Prop()
  reference?: string;

  @Prop()
  note?: string;

  @Prop({ required: true })
  receivedBy!: string;

  @Prop({ default: Date.now })
  paidAt!: Date;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const WorkOrderPaymentSchema = SchemaFactory.createForClass(WorkOrderPaymentEntity);
WorkOrderPaymentSchema.index({ workOrderNo: 1, paidAt: -1 });
