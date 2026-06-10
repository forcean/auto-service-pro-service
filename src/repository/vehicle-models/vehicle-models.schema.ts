import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'vehicleModels' })
export class VehicleModelsEntity {
  @Prop({ type: String })
  model!: string;

  @Prop({ type: String })
  modelCode!: string;

  @Prop({ type: String })
  generation!: string;

  @Prop({ type: String })
  brandCode!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const VehicleModelsSchema = SchemaFactory.createForClass(VehicleModelsEntity);