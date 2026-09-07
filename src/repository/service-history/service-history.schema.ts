import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WorkOrderEntity } from '../work-order/work-order.schema';
import { CustomersVehicleEntity } from '../customers-vehicle/customers-vehicle.schema';
import { InvoiceEntity } from '../invoice/invoice.schema';

export type ServiceHistoryDocument = HydratedDocument<ServiceHistoryEntity>;

@Schema({ _id: false })
export class ServiceHistoryItem {
  @Prop({ required: true }) description!: string;
  @Prop({ required: true, min: 1 }) quantity!: number;
  @Prop({ required: true, min: 0 }) amount!: number;
}

@Schema({ timestamps: true, collection: 'service_histories' })
export class ServiceHistoryEntity {
  @Prop({
    type: Types.ObjectId,
    ref: WorkOrderEntity.name,
    required: true,
    unique: true,
  })
  workOrderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: CustomersVehicleEntity.name,
    required: true,
    index: true,
  })
  vehicleId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: InvoiceEntity.name,
    required: true,
    index: true,
  })
  invoiceId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  workOrderNo!: string;

  @Prop({ required: true })
  mileage!: number;

  @Prop({ type: [ServiceHistoryItem], default: [] })
  items!: ServiceHistoryItem[];

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const ServiceHistorySchema =
  SchemaFactory.createForClass(ServiceHistoryEntity);
