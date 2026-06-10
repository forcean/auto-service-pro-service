import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'vehicleBrands' })
export class VehicleBrandsEntity {
  @Prop({ type: String, unique: true })
  brand!: string;

  @Prop({ type: String, unique: true })
  brandCode!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const VehicleBrandsSchema = SchemaFactory.createForClass(VehicleBrandsEntity);