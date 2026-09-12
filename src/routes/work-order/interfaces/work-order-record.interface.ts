import { Types } from 'mongoose';
import { EFuelLevel, EWorkOrderStatus } from '../enums/work-order.enum';

export interface IComplaint {
  title: string;
  description?: string;
}

export interface IInspectionItem {
  item: string;
  status: 'GOOD' | 'WARNING' | 'BAD';
  remark?: string;
}

export interface IWorkOrderRecord {
  _id: Types.ObjectId;
  workOrderNo: string;
  vehicleId: Types.ObjectId;
  customerId: Types.ObjectId;
  advisorId?: Types.ObjectId;
  currentQuotationId?: Types.ObjectId;
  status: EWorkOrderStatus;
  mileage: number;
  fuelLevel?: EFuelLevel;
  complaints: IComplaint[];
  inspectionRequired: boolean;
  inspections?: IInspectionItem[];
  diagnosis?: string;
  customerRemark?: string;
  internalRemark?: string;
  images?: string[];
  expectedFinishDate?: Date;
  isDeleted: boolean;
  createdDt: Date;
  createdBy: string;
  updatedDt?: Date;
  updatedBy?: string;
  progress?: number;
  taskSummary?: {
    totalTasks: number;
    completedTasks: number;
    cancelledTasks: number;
  };
}

// รอ refactor
// export interface IWorkOrderDetailRecord
//   extends Omit<
//     IWorkOrderRecord,
//     'vehicleId' | 'customerId' | 'advisorId'
//   > {
//   vehicleId: IVehicleRecord;

//   customerId: ICustomerRecord;

//   advisorId?: IUserRecord;
// }
