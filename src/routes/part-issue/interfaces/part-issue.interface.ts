import {
  EPartIssueReason,
  EPartIssueStatus,
} from '../enums/part-issue.enum';

export interface IPartIssueItemRequest {
  productId: string;
  sku: string;
  productName: string;
  requestedQty: number;
  reservedQty: number;
  issuedQty: number;
  reason: EPartIssueReason;
  isAdditionalCharge: boolean;
  unitPrice: number;
  remark?: string;
}

export interface ICreatePartIssueRequest {
  issueNo: string;
  workOrderNo: string;
  taskNo: string;
  items: IPartIssueItemRequest[];
  requestedBy?: string;
  requestedByName?: string;
  requestedAt?: Date;
  reason?: EPartIssueReason;
  remark?: string;
}

export interface IIssuePartIssueItemRequest {
  productId: string;
  issuedQty: number;
  remark?: string;
}

export interface IUpdatePartIssueItemsRequest {
  items: IPartIssueItemRequest[];
  status: EPartIssueStatus;
  updatedBy: string;
}

export interface ICancelPartIssueRequest {
  items: IPartIssueItemRequest[];
  remark?: string;
  updatedBy: string;
}