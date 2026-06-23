import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument, Types } from 'mongoose';
import { EStockMovementType } from 'src/routes/stock-management/enums/stock.enum';

export type StockMovementDocument = HydratedDocument<StockMovementEntity>;

@Schema({
  collection: 'stock_movements',
  timestamps: true,
})
export class StockMovementEntity {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId!: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
  })
  sku!: string;

  @Prop({
    enum: EStockMovementType,
    required: true,
    index: true,
  })
  movementType!: EStockMovementType;

  /**
   * จำนวนที่เปลี่ยน
   */
  @Prop({
    required: true,
  })
  quantity!: number;

  /**
   * ยอดก่อน
   */
  @Prop({
    required: true,
  })
  beforeQty!: number;

  /**
   * ยอดหลัง
   */
  @Prop({
    required: true,
  })
  afterQty!: number;

  /**
   * PURCHASE_ORDER
   * WORK_ORDER
   * SALE_ORDER
   */
  @Prop()
  referenceType?: string;

  /**
   * PO-001
   * WO-001
   */
  @Prop()
  referenceId?: string;

  @Prop()
  remark?: string;

  @Prop()
  createdBy?: string;
}

export const StockMovementSchema =
  SchemaFactory.createForClass(StockMovementEntity);
