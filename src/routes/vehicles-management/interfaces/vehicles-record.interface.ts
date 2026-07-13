import { EVehicleStatus } from '../enums/customers-vehicle.enum';
import { IVehicles } from './vehicles.interface';

export interface ICustomerVehicleRecord {
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