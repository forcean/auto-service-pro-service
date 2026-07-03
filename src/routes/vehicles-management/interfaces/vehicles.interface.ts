import { ObjectId } from 'typeorm';

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
