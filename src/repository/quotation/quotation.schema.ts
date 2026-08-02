import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EQuotationItemType } from 'src/routes/quotation/dtos/quotation.dto';
import {
  EApprovalMethod,
  ECustomerDecision,
  EQuotationStatus,
} from 'src/routes/quotation/enums/quotation.enum';

export type QuotationDocument = HydratedDocument<QuotationEntity>;
@Schema({ _id: false })
export class QuotationItem {
  @Prop({
    enum: EQuotationItemType,
    required: true,
  })
  itemType!: EQuotationItemType;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProductsEntity',
  })
  productId?: Types.ObjectId;

  // Snapshot
  @Prop()
  sku?: string;

  @Prop({
    required: true,
  })
  description!: string;

  @Prop({
    required: true,
  })
  quantity!: number;

  @Prop({
    required: true,
  })
  unitPrice!: number;

  @Prop({
    default: 0,
  })
  discountAmount!: number;

  @Prop({
    required: true,
  })
  totalAmount!: number;

  @Prop()
  remark?: string;
}

export const QuotationItemSchema = SchemaFactory.createForClass(QuotationItem);

@Schema({ _id: false })
export class ApprovalHistory {
  @Prop({
    enum: ECustomerDecision,
    required: true,
  })
  decision!: ECustomerDecision;

  @Prop()
  customerName!: string;

  @Prop({
    enum: EApprovalMethod,
  })
  method!: EApprovalMethod;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  approvedBy!: Types.ObjectId;

  @Prop({
    default: Date.now,
  })
  approvedAt!: Date;

  @Prop()
  note?: string;
}

@Schema({
  timestamps: true,
  collection: 'quotations',
})
export class QuotationEntity {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  quotationNo!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'WorkOrder',
    required: true,
    index: true,
  })
  workOrderId!: Types.ObjectId;

  @Prop({
    enum: EQuotationStatus,
    default: EQuotationStatus.DRAFT,
    index: true,
  })
  status!: EQuotationStatus;

  // รองรับ Revision
  @Prop({
    default: 1,
  })
  version!: number;

  @Prop({
    default: true,
  })
  isLatest!: boolean;

  // Summary
  @Prop({
    default: 0,
  })
  partTotal!: number;

  @Prop({
    default: 0,
  })
  laborTotal!: number;

  @Prop({
    default: 0,
  })
  serviceTotal!: number;

  @Prop({
    default: 0,
  })
  grandTotal!: number;

  @Prop()
  validUntil?: Date;

  @Prop()
  customerRemark?: string;

  @Prop()
  internalRemark?: string;

  @Prop({
    type: [ApprovalHistory],
    default: [],
  })
  approvalHistory!: ApprovalHistory[];

  @Prop({
    default: true,
  })
  includeVat!: boolean;

  @Prop({
    default: 7,
  })
  taxPercent!: number;

  @Prop({
    default: 0,
  })
  discountAmount!: number;

  @Prop({
    default: 0,
  })
  vatAmount!: number;

  @Prop({
    type: [QuotationItemSchema],
    default: [],
  })
  items!: QuotationItem[];

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

export const QuotationSchema = SchemaFactory.createForClass(QuotationEntity);

QuotationSchema.index({ quotationNo: 1 });
QuotationSchema.index({ workOrderId: 1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ version: 1 });
QuotationSchema.index({ isLatest: 1 });
QuotationSchema.index({ createdAt: -1 });
