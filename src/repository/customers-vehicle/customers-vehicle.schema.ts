import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EVehicleStatus } from 'src/routes/vehicles-management/enums/customers-vehicle.enum';

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

@Schema({ collection: 'customersVehicle' })
export class CustomersVehicleEntity {
  @Prop({ required: true, type: String })
  firstname!: string;

  @Prop({ required: true, type: String })
  lastname!: string;

  @Prop({ required: true, type: String })
  phoneNumber!: string;

  @Prop({ type: String })
  billingName?: string;

  @Prop({ type: String })
  taxId?: string;

  @Prop({ type: String })
  billingAddress?: string;

  @Prop({ type: String })
  branchNo?: string;

  @Prop({ required: true, type: String })
  licensePlate!: string;

  @Prop({ required: true, type: String })
  province!: string;

  @Prop({ required: true, type: Vehicle, _id: false })
  vehicle!: Vehicle;

  @Prop({ required: true, enum: EVehicleStatus })
  status!: EVehicleStatus;

  @Prop({ required: true, type: String })
  vin!: string;

  @Prop({ type: String })
  engine_no?: string;

  @Prop({ type: String })
  color?: string;

  @Prop({ required: true, type: String })
  mileage!: string;

  @Prop({ type: Date })
  registrationDt!: Date;

  @Prop({ type: String })
  createdBy!: string;

  @Prop({ type: Date })
  updatedDt!: Date;

  @Prop({ type: String })
  updatedBy!: string;
}

export const CustomersVehicleSchema = SchemaFactory.createForClass(
  CustomersVehicleEntity,
);
