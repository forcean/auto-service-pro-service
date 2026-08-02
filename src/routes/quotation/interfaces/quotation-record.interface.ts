import { Types } from 'mongoose';
import { EQuotationItemType } from '../dtos/quotation.dto';

export interface IQuotationItem {
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

export interface ICreateQuotation {
  quotationNo: string;
  workOrderId: string;
  validUntil?: string;
  includeVat: boolean;
  taxPercent: number;
  partTotal: number;
  laborTotal: number;
  serviceTotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
  customerRemark?: string;
  internalRemark?: string;
  items: IQuotationItem[];
}
