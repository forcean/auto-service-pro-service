import { Type } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  EStockMovementType,
  EStockStatus,
} from 'src/routes/stock-management/enums/stock.enum';

export enum EProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export interface IEngine {
  code: string;
  fuel: string;
}

export interface IVehicle {
  vehicleId: string;
  yearFrom: number;
  yearTo: number;
  engines: IEngine[];
  remark?: string;
}

export interface IProductVehicleDetail extends IVehicle {
  _id: string;
  brand: string;
  brandCode: string;
  model: string;
  modelCode: string;
  generation: string;
  platform: string;
  isActive: boolean;
}

export interface IPrice {
  cost: number;
  retail: number;
  wholesale?: number;
}

export interface ISpec {
  unit?: string;
  weight?: string;
  width?: string;
  height?: string;
  depth?: string;
}

export interface IMedia {
  fileId: string;
  url: string;
  isPrimary: boolean;
}

export interface IProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryPath: string[];
  brandId: string;
  vehicles?: IVehicle[];
  price?: IPrice;
  spec?: ISpec;
  media?: IMedia[];
  status: EProductStatus;
  isDeleted: boolean;
  isStocked: boolean;
  createdBy: string;
  createdDt: Date;
  updatedBy?: string;
  updatedDt?: Date;
  deletedBy?: string;
  deletedDt?: Date;
}

export interface IProductDetail extends IProduct {
  categoryName: string;
  brandName: string;
  vehicles: IProductVehicleDetail[];
}

export interface IStockInfo {
  id: string;
  productId: Types.ObjectId | string;
  sku: string;
  warehouseId?: Types.ObjectId | string | null;
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

export interface IStockMovement {
  id: string;
  productId: Types.ObjectId | string;
  sku: string;
  type: EStockMovementType;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  reference?: string;
  createdBy?: string;
  createdDt: Date;
}

export interface IProductStockSummary {
  quantity: number;
  reserved: number;
  available: number;
  minStock: number;
}

export interface IProductDetailResponse {
  product: IProductDetail;
  stockInfo: IStockInfo | null;
  stockSummary?: IProductStockSummary;
  recentMovements?: IStockMovement[];
}

export interface IReqCreateProduct {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryPath: string[];
  brandId: string;
  vehicles?: IVehicle[];
  price?: IPrice;
  spec?: ISpec;
  media?: IMedia[];
  status: EProductStatus;
  isStocked?: boolean;
}

export interface IReqUpdateProduct {
  name?: string;
  description?: string;
  categoryId?: string;
  categoryPath?: string[];
  brandId?: string;
  vehicles?: IVehicle[];
  price?: IPrice;
  spec?: ISpec;
  media?: IMedia[];
  status?: EProductStatus;
  isStocked?: boolean;
}
export interface ICreateProductResponse {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryPath: string[];
  brandId: string;
  vehicles?: IVehicle[];
  price?: IPrice;
  spec?: ISpec;
  media?: IMedia[];
  status: EProductStatus;
  isDeleted: boolean;
  createdBy: string;
  createdDt: Date;
  updatedBy: string;
  updatedDt: Date;
  isStocked: boolean;
  deletedDt?: Date;
  deletedBy?: string;
}
