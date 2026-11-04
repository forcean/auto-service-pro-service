import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DailyClosingDocument = HydratedDocument<DailyClosingEntity>;

/** Immutable end-of-day cash drawer snapshot. */
@Schema({ timestamps: true, collection: 'daily_closings' })
export class DailyClosingEntity {
  @Prop({ required: true, unique: true, index: true })
  businessDate!: string;

  @Prop({ required: true, min: 0 })
  openingCash!: number;

  @Prop({ required: true, min: 0 })
  cashPayments!: number;

  @Prop({ required: true, min: 0 })
  cashRefunds!: number;

  @Prop({ required: true, min: 0 })
  expectedCash!: number;

  @Prop({ required: true, min: 0 })
  declaredCash!: number;

  @Prop({ required: true })
  variance!: number;

  @Prop({ default: 0, min: 0 })
  unclassifiedRefunds!: number;

  @Prop()
  note?: string;

  @Prop({ required: true })
  closedBy!: string;

  @Prop({ default: Date.now })
  closedAt!: Date;
}

export const DailyClosingSchema = SchemaFactory.createForClass(DailyClosingEntity);
