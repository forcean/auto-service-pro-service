import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EApprovalMethod, ECustomerDecision, EQuotationStatus } from 'src/routes/quotation/enums/quotation.enum';

export type QuotationDocument = HydratedDocument<Quotation>;

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
export class Quotation {
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
  discount!: number;

  @Prop({
    default: 0,
  })
  vat!: number;

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

export const QuotationSchema = SchemaFactory.createForClass(Quotation);

QuotationSchema.index({ quotationNo: 1 });
QuotationSchema.index({ workOrderId: 1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ version: 1 });
QuotationSchema.index({ isLatest: 1 });
QuotationSchema.index({ createdAt: -1 });
