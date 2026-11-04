import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CustomersVehicleEntity } from '../customers-vehicle/customers-vehicle.schema';

export type VehicleDocumentDocument = HydratedDocument<VehicleDocumentEntity>;

@Schema({ timestamps: true, collection: 'vehicle_documents' })
export class VehicleDocumentEntity {
  @Prop({
    type: Types.ObjectId,
    ref: CustomersVehicleEntity.name,
    required: true,
    index: true,
  })
  vehicleId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['Invoice', 'Receipt', 'Warranty', 'Insurance', 'Quotation', 'Other'],
    default: 'Other',
  })
  category!: string;

  @Prop({ required: true })
  extension!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, min: 0 })
  size!: number;

  // Stored separately from list projections so file content is never sent
  // together with the document index.
  @Prop({ required: true, select: false })
  content!: string;

  @Prop()
  description?: string;

  @Prop()
  uploadedBy?: string;

  @Prop()
  deletedBy?: string;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const VehicleDocumentSchema =
  SchemaFactory.createForClass(VehicleDocumentEntity);

VehicleDocumentSchema.index({ vehicleId: 1, createdAt: -1 });
