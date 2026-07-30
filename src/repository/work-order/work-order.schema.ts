import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EFuelLevel, EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';

export type WorkOrderDocument = HydratedDocument<WorkOrderEntity>;


@Schema({ _id: false })
export class Complaint {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class InspectionItem {
  @Prop({ required: true })
  item!: string;

  @Prop({
    enum: ['GOOD', 'WARNING', 'BAD'],
    default: 'GOOD',
  })
  status!: string;

  @Prop()
  remark?: string;
}

@Schema({
  timestamps: true,
  collection: 'work_orders',
})
export class WorkOrderEntity {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  workOrderNo!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true,
  })
  vehicleId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  })
  customerId!: Types.ObjectId;

  @Prop({
    enum: EWorkOrderStatus,
    default: EWorkOrderStatus.OPEN,
    index: true,
  })
  status!: EWorkOrderStatus;

  @Prop({
    required: true,
  })
  mileage!: number;

  @Prop({
    enum: EFuelLevel,
  })
  fuelLevel?: EFuelLevel;

  @Prop({
    type: [Complaint],
    default: [],
  })
  complaints!: Complaint[];

  @Prop({
    default: false,
  })
  inspectionRequired!: boolean;

  @Prop({
    type: [InspectionItem],
    default: [],
  })
  inspections!: InspectionItem[];

  @Prop()
  diagnosis?: string;

  @Prop()
  customerRemark?: string;

  @Prop()
  internalRemark?: string;

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  @Prop({
    required: true,
    default: Date.now,
  })
  checkInDate!: Date;

  @Prop()
  expectedFinishDate?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'Quotation',
  })
  currentQuotationId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Invoice',
  })
  invoiceId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  advisorId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isDeleted!: boolean;
}

export const WorkOrderSchema = SchemaFactory.createForClass(WorkOrderEntity);

WorkOrderSchema.index({ workOrderNo: 1 });
WorkOrderSchema.index({ vehicleId: 1 });
WorkOrderSchema.index({ customerId: 1 });
WorkOrderSchema.index({ status: 1 });
WorkOrderSchema.index({ createdAt: -1 });
