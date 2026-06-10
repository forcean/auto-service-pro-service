import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'skuCounters' })
export class SkuCountersEntity {
  @Prop({ type: String, unique: true })
  sku!: string;

  @Prop({ type: Number })
  seq!: number;

}

export const SkuCountersSchema = SchemaFactory.createForClass(SkuCountersEntity);