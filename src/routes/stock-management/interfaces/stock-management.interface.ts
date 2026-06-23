export interface IStockManagementResponse {
  id: string;
  productId: string;
  sku: string;
  warehouseId?: string | null;
  quantity: number;
  reserved: number;
  available: number;
  minStock: number;
  status: 'normal' | 'low' | 'out';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
}