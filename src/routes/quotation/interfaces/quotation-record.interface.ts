import { Types } from 'mongoose';
import {
  EApprovalMethod,
  ECustomerDecision,
  EQuotationItemType,
  EQuotationStatus,
} from '../enums/quotation.enum';

export interface IQuotationRecord {
  id: string;
  quotationNo: string;
  workOrder: IQuotationWorkOrder;
  status: EQuotationStatus;
  version: number;
  isLatest: boolean;
  partTotal: number;
  laborTotal: number;
  serviceTotal: number;
  grandTotal: number;
  validUntil?: string;
  customerRemark?: string;
  internalRemark?: string;
  includeVat: boolean;
  taxPercent: number;
  discountAmount: number;
  vatAmount: number;
  items: IQuotationItemRecord[];
  approvalHistory: IApprovalHistory[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IQuotationItemRecord {
  itemType: EQuotationItemType;
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalAmount: number;
  remark?: string;
}

export interface IApprovalHistory {
  decision: ECustomerDecision;
  customerName: string;
  method: EApprovalMethod;
  approvedBy: string;
  approvedAt: string;
  note?: string;
}

export interface IQuotationWorkOrder {
  id: string;
  workOrderNo: string;
  vehicleId: string;
  customerId: string;
  advisorId?: string;
  status: string;
}
