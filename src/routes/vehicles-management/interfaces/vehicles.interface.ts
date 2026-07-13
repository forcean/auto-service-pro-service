import { ObjectId } from 'typeorm';
import { EVehicleStatus } from '../enums/customers-vehicle.enum';

export interface IVehicleBrands {
  name: string;
  code: string;
}

export interface IVehicleBrandsResponse {
  vehicleBrands: IVehicleBrands[];
}

export interface IIVehicleModels {
  model: string;
  modelCode: string;
  generation: string;
}

export interface IVehicleModelsResponse {
  vehicleModels: IIVehicleModels[];
}

export interface IEngines{
  code: string; 
  fuel: string;
}

export interface IVehicles {
  id: ObjectId;
  brand: string;
  brandCode: string;
  model: string;
  modelCode: string;
  generation: string;
  platform: string;
  yearFrom: number;
  yearTo: number;
  engines: IEngines[];
  isActive: boolean;
}

export interface IVehicleResponse {
  vehicles: IVehicles;
}

export interface ICustomerVehicle {
  firstname: string;
  lastname: string;
  phoneNumber: string;
  licensePlate: string;
  province: string;
  status: EVehicleStatus;
  vehicle: IVehicles;
  registrationDt: Date;
  createdBy: string;
  updatedDt?: Date;
  updatedBy?: string;
}
