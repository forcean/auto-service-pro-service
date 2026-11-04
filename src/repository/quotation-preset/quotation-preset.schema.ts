import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductsEntity } from '../products/products.schema';

export type QuotationPresetDocument = HydratedDocument<QuotationPresetEntity>;

@Schema({ _id: false })
export class QuotationPresetItem {
  @Prop({
    type: Types.ObjectId,
    ref: ProductsEntity.name,
    required: true,
  })
  productId!: Types.ObjectId;

  /** Snapshot fields make a preset understandable even when a product is renamed. */
  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ default: 0, min: 0 })
  unitPrice!: number;
}

export const QuotationPresetItemSchema =
  SchemaFactory.createForClass(QuotationPresetItem);

@Schema({
  timestamps: true,
  collection: 'quotation_presets',
})
export class QuotationPresetEntity {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [QuotationPresetItemSchema], default: [] })
  items!: QuotationPresetItem[];

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const QuotationPresetSchema =
  SchemaFactory.createForClass(QuotationPresetEntity);

QuotationPresetSchema.index({ isDeleted: 1, isActive: 1, name: 1 });
