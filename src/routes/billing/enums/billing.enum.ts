export enum EInvoiceStatus {
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOID = 'VOID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
}

export enum EInvoiceItemType {
  PART = 'PART',
  LABOR = 'LABOR',
  SERVICE = 'SERVICE',
}

export enum EPaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  QR = 'QR',
  OTHER = 'OTHER',
}
