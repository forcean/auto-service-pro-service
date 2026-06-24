import { Types } from "mongoose";
import { EStockStatus } from "../enums/stock.enum";

export interface IStockManagementResponse {
  id: string;
  productId: Types.ObjectId |string;
  sku: string;
  warehouseId?: Types.ObjectId |string | null;
  quantity: number;
  reserved: number;
  available?: number;
  minStock: number;
  status?: EStockStatus;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
}