import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class Vehicle {
  @Prop({ type: String })
  brand!: string;

  @Prop({ type: String })
  brandCode!: string;

  @Prop({ type: String })
  model!: string;

  @Prop({ type: String })
  modelCode!: string;

  @Prop({ type: String })
  generation!: string;

  @Prop({ type: String })
  platform!: string;

  @Prop({ type: Number })
  yearFrom!: number;

  @Prop({ type: Number })
  yearTo!: number;

  @Prop([
    {
      code: String,
      fuel: String,
    },
  ])
  engines!: {
    code: string;
    fuel: string;
  }[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

@Schema({ collection: 'customers_vehicle' })
export class CustomersVehicleEntity {
  @Prop({ required: true, type: String })
  firstname!: string;

  @Prop({ required: true, type: String })
  lastname!: string;

  @Prop({ required: true, type: String })
  phoneNumber!: string;

  @Prop({ required: true, type: String })
  licensePlate!: string;

  @Prop({ required: true, type: String })
  province!: string;

  @Prop({ required: true, type: Vehicle, _id: false })
  vehicle!: Vehicle;

  @Prop({ type: Date })
  registrationDate!: Date;

  @Prop({ type: String })
  createdBy!: string;
}

export const CustomersVehicleSchema = SchemaFactory.createForClass(
  CustomersVehicleEntity,
);
