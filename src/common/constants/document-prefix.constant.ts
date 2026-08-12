import { EDocumentType, ESequenceType } from "../enums/document-type.enum";

export const DOCUMENT_PREFIX: Record<EDocumentType, string> = {
  [EDocumentType.WORK_ORDER]: 'WO',
  [EDocumentType.QUOTATION]: 'QT',
  [EDocumentType.INVOICE]: 'IV',
  [EDocumentType.PAYMENT]: 'PM',
  [EDocumentType.PURCHASE_ORDER]: 'PO',
};

export const SEQUENCE_PREFIX = {
  [ESequenceType.WORK_ORDER_TASK]: '-T',
};