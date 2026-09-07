import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UsersEntity } from '../users/users.schema';
import { WorkOrderEntity } from '../work-order/work-order.schema';
import { QuotationEntity } from '../quotation/quotation.schema';
import {
  EInvoiceItemType,
  EInvoiceStatus,
  EPaymentMethod,
} from 'src/routes/billing/enums/billing.enum';

export type InvoiceDocument = HydratedDocument<InvoiceEntity>;

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ enum: EInvoiceItemType, required: true })
  itemType!: EInvoiceItemType;

  @Prop({ type: Types.ObjectId, ref: 'ProductsEntity' })
  productId?: Types.ObjectId;

  @Prop()
  sku?: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop()
  sourcePartIssueNo?: string;
}

@Schema({ _id: false })
export class PaymentRecord {
  @Prop({ required: true, unique: false })
  paymentNo!: string;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ enum: EPaymentMethod, required: true })
  method!: EPaymentMethod;

  @Prop()
  reference?: string;
  @Prop()
  note?: string;

  @Prop({ type: Types.ObjectId, ref: UsersEntity.name, required: true })
  receivedBy!: Types.ObjectId;

  @Prop({ default: Date.now })
  paidAt!: Date;
}

@Schema({ _id: false })
export class RefundRecord {
  @Prop({ required: true })
  refundNo!: string;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: UsersEntity.name, required: true })
  refundedBy!: Types.ObjectId;

  @Prop({ default: Date.now })
  refundedAt!: Date;
}

@Schema({ timestamps: true, collection: 'invoices' })
export class InvoiceEntity {
  @Prop({ required: true, unique: true, index: true }) invoiceNo!: string;
  @Prop({
    type: Types.ObjectId,
    ref: WorkOrderEntity.name,
    required: true,
    index: true,
  })
  workOrderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: QuotationEntity.name,
    required: true,
    index: true,
  })
  quotationId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  workOrderNo!: string;

  @Prop({ enum: EInvoiceStatus, default: EInvoiceStatus.ISSUED, index: true })
  status!: EInvoiceStatus;

  @Prop({ type: [InvoiceItem], default: [] })
  items!: InvoiceItem[];

  @Prop({ default: 0 })
  partTotal!: number;

  @Prop({ default: 0 })
  laborTotal!: number;

  @Prop({ default: 0 })
  serviceTotal!: number;

  @Prop({ default: 0 })
  discountAmount!: number;

  @Prop({ default: 0 })
  vatAmount!: number;

  @Prop({ default: 0 })
  grandTotal!: number;

  @Prop({ default: 0 })
  paidAmount!: number;

  @Prop({ type: [PaymentRecord], default: [] }) payments!: PaymentRecord[];

  @Prop({ type: [RefundRecord], default: [] }) refunds!: RefundRecord[];

  @Prop({ default: 0 })
  refundedAmount!: number;

  @Prop({ type: Types.ObjectId, ref: UsersEntity.name, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: UsersEntity.name })
  updatedBy?: Types.ObjectId;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(InvoiceEntity);
InvoiceSchema.index(
  { workOrderId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
InvoiceSchema.index({ status: 1, createdAt: -1 });
