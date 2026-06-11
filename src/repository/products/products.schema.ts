import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId as String } from 'typeorm';

export class Vehicles {
  @Prop({ type: String })
  vehicleId!: string;

  @Prop({ type: Number })
  yearFrom!: number;

  @Prop({ type: Number })
  yearTo!: number;

  @Prop({
    type: [
      {
        code: { type: String },
        fuel: { type: String }
      }
    ]
  })
  engines: {
    code: string;
    fuel: string;
  }[];

  @Prop({ type: String })
  remark!: string;
}

export class Price {
  @Prop({ type: Number })
  cost!: number;

  @Prop({ type: Number })
  retail!: number;

  @Prop({ type: Number })
  wholesale?: number;
}

export class Spec {
  @Prop({ type: String })
  unit!: string;

  @Prop({ type: String })
  weight!: string;

  @Prop({ type: String })
  width!: string;

  @Prop({ type: String })
  height!: string;

  @Prop({ type: String })
  depth!: string;
}

export class Media {
  @Prop({ type: String })
  fileId: string;

  @Prop({ type: String })
  url: string;

  @Prop({ type: Boolean })
  isPrimary: boolean;
}

@Schema({ collection: 'products' })
export class ProductsEntity {
  @Prop({ type: String, unique: true })
  sku!: string;

  @Prop({ type: String })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  categoryId!: string;

  @Prop({ type: [String] })
  categoryPath!: string[];

  @Prop({ type: String })
  brandId!: string;

  @Prop({ type: [Vehicles], _id: false, default: [] })
  vehicles?: Vehicles[];

  @Prop({ type: Price, _id: false, default: {} })
  price?: Price;

  @Prop({ type: Spec, _id: false, default: {} })
  spec?: Spec;

  @Prop({ type: [Media], _id: false, default: [] })
  media?: Media[];

  @Prop({ type: String })
  status!: string;

  @Prop({ type: Boolean })
  isDeleted!: boolean;

  @Prop({ type: String })
  createdBy!: string;

  @Prop({ type: Date })
  createdDt!: Date;

  @Prop({ type: String })
  updatedBy!: string;
  
  @Prop({ type: Date })
  updatedDt!: Date;

  @Prop({ type: Date })
  deletedDt?: Date;

  @Prop({ type: String })
  deletedBy?: string;

}

export const ProductsSchema = SchemaFactory.createForClass(ProductsEntity);