export enum EQuotationStatus {
  DRAFT = 'DRAFT',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum EApprovalMethod {
  PHONE = 'PHONE',
  LINE = 'LINE',
  FACEBOOK = 'FACEBOOK',
  IN_PERSON = 'IN_PERSON',
}

export enum ECustomerDecision {
  APPROVED = 'APPROVED',
  PARTIAL = 'PARTIAL',
  REJECTED = 'REJECTED',
}

export enum EQuotationItemType {
  PART = 'PART',
  LABOR = 'LABOR',
  SERVICE = 'SERVICE',
}
