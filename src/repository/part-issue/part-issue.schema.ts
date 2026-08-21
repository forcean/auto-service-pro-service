import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { WorkOrderEntity } from '../work-order/work-order.schema';
import { UsersEntity } from '../users/users.schema';
import { ProductsEntity } from '../products/products.schema';
import {
  EPartIssueReason,
  EPartIssueStatus,
} from 'src/routes/part-issue/enums/part-issue.enum';

export type PartIssueDocument = HydratedDocument<PartIssueEntity>;

/**
 * Item ที่ Store จ่ายออกมา
 *
 * 1 PartIssue สามารถมีหลายรายการได้
 *
 * เช่น
 * PartIssue PI2026000001
 *   - Brake Pad x 1
 *   - Brake Disc x 2
 */
@Schema({ _id: false })
export class PartIssueItem {
  [x: string]: any;
  @Prop({
    type: Types.ObjectId,
    ref: ProductsEntity.name,
    required: true,
  })
  productId!: Types.ObjectId;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
  })
  sku!: string;

  @Prop({
    required: true,
    trim: true,
  })
  productName!: string;

  @Prop({
    required: true,
    min: 1,
  })
  requestedQty!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  reservedQty!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  issuedQty!: number;

  // ...
}

export const PartIssueItemSchema = SchemaFactory.createForClass(PartIssueItem);

@Schema({
  collection: 'part_issues',
  timestamps: true,
})
export class PartIssueEntity {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  issueNo!: string;

  @Prop({
    required: true,
    index: true,
  })
  workOrderNo!: string;

  @Prop({
    required: true,
    index: true,
  })
  taskNo!: string;

  @Prop({
    type: [PartIssueItemSchema],
    required: true,
    default: [],
  })
  items!: PartIssueItem[];

  @Prop({
    enum: EPartIssueStatus,
    required: true,
    default: EPartIssueStatus.REQUESTED,
    index: true,
  })
  status!: EPartIssueStatus;

  @Prop({
    type: Types.ObjectId,
    ref: UsersEntity.name,
  })
  requestedBy?: Types.ObjectId;

  @Prop()
  requestedByName?: string;

  @Prop()
  requestedAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: UsersEntity.name,
  })
  issuedBy?: Types.ObjectId;

  @Prop()
  issuedByName?: string;

  @Prop()
  issuedAt?: Date;

  @Prop({
    enum: EPartIssueReason,
  })
  reason?: EPartIssueReason;

  @Prop()
  remark?: string;

  @Prop({
    default: false,
    index: true,
  })
  isDeleted!: boolean;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop()
  deletedBy?: string;

  @Prop()
  deletedDt?: Date;
}

export const PartIssueSchema = SchemaFactory.createForClass(PartIssueEntity);

PartIssueSchema.index({
  workOrderNo: 1,
  taskNo: 1,
  status: 1,
});

PartIssueSchema.index({
  status: 1,
  createdAt: -1,
});

PartIssueSchema.index({
  requestedBy: 1,
});

PartIssueSchema.index({
  issuedBy: 1,
});
