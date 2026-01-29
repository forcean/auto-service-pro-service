import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'vehicles' })
export class VehiclesEntity {
  @Prop({ type: String })
  brand: string;

  @Prop({ type: String })
  brandCode: string;

  @Prop({ type: String })
  model: string;

  @Prop({ type: String })
  modelCode: string;

  @Prop({ type: String })
  generation: string;

  @Prop({ type: String })
  platform: string;

  @Prop({ type: Number })
  yearFrom: number;

  @Prop({ type: Number })
  yearTo: number;

  @Prop([
    {
      code: String,
      fuel: String,
    },
  ])
  engines: {
    code: string;
    fuel: string;
  }[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const VehiclesSchema = SchemaFactory.createForClass(VehiclesEntity);