import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockDocument =
  HydratedDocument<StockEntity>;

@Schema({
  collection: 'stocks',
  timestamps: true,
})
export class StockEntity {
  /**
   * Product Reference
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId!: Types.ObjectId;

  /**
   * SKU Snapshot
   * เก็บซ้ำจาก Product เพื่อ Search และ Export
   */
  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  sku!: string;

  /**
   * Future Multi Warehouse Support
   * ตอนนี้ยังไม่ใช้จริง
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Warehouse',
    default: null,
    index: true,
  })
  warehouseId?: Types.ObjectId | null;

  /**
   * จำนวนคงเหลือทั้งหมด
   */
  @Prop({
    type: Number,
    required: true,
    default: 0,
    min: 0,
  })
  quantity!: number;

  /**
   * จำนวนที่ถูกจองไว้
   */
  @Prop({
    type: Number,
    required: true,
    default: 0,
    min: 0,
  })
  reserved!: number;

  /**
   * แจ้งเตือนของใกล้หมด
   */
  @Prop({
    type: Number,
    required: true,
    default: 5,
    min: 0,
  })
  minStock!: number;

  /**
   * Soft Delete
   */
  @Prop({
    type: Boolean,
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

export const StockSchema =
  SchemaFactory.createForClass(
    StockEntity,
  );

StockSchema.index(
  {
    productId: 1,
  },
  {
    unique: true,
  },
);

StockSchema.index({
  sku: 1,
});

StockSchema.index({
  isDeleted: 1,
});

StockSchema.index({
  warehouseId: 1,
});