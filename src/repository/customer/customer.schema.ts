import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<CustomerEntity>;

/** Canonical customer profile. Vehicles only keep a synced display snapshot. */
@Schema({ timestamps: true, collection: 'customers' })
export class CustomerEntity {
  @Prop({ type: String, required: true, trim: true })
  firstname!: string;

  @Prop({ type: String, required: true, trim: true })
  lastname!: string;

  @Prop({ type: String, required: true, trim: true })
  phoneNumber!: string;

  @Prop({ type: String, required: true, trim: true, unique: true, index: true })
  phoneNumberNormalized!: string;

  @Prop({ type: String, trim: true })
  billingName?: string;

  @Prop({ type: String, trim: true })
  taxId?: string;

  @Prop({ type: String, trim: true })
  billingAddress?: string;

  @Prop({ type: String, trim: true })
  branchNo?: string;

  /** A legacy phone group had more than one spelling of the customer's name. */
  @Prop({ type: Boolean, default: false })
  needsReview!: boolean;

  @Prop({ type: String })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(CustomerEntity);
