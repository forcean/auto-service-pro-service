import { EDocumentType } from "../enums/document-type.enum";

export const DOCUMENT_PREFIX: Record<EDocumentType, string> = {
  [EDocumentType.WORK_ORDER]: 'WO',
  [EDocumentType.QUOTATION]: 'QT',
  [EDocumentType.INVOICE]: 'IV',
  [EDocumentType.PAYMENT]: 'PM',
  [EDocumentType.PURCHASE_ORDER]: 'PO',
};