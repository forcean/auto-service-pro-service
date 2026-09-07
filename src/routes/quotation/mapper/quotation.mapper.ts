import { mapMongoId } from 'src/common/helper/mongo.helper';
import { IQuotationRecord } from '../interfaces/quotation-record.interface';

export class QuotationMapper {
  static toRecord(quotation: any): IQuotationRecord {
    const q = mapMongoId(quotation);

    const workOrder = q.workOrderId;

    return {
      id: q.id,
      quotationNo: q.quotationNo,
      workOrder: {
        id: workOrder._id.toString(),
        workOrderNo: workOrder.workOrderNo,
        vehicleId: workOrder.vehicleId?.toString(),
        customerId: workOrder.customerId?.toString(),
        advisorId: workOrder.advisorId?.toString(),
        status: workOrder.status,
      },
      status: q.status,
      version: q.version,
      isLatest: q.isLatest,
      partTotal: q.partTotal,
      laborTotal: q.laborTotal,
      serviceTotal: q.serviceTotal,
      grandTotal: q.grandTotal,
      validUntil: q.validUntil?.toISOString(),
      customerRemark: q.customerRemark,
      internalRemark: q.internalRemark,
      includeVat: q.includeVat,
      taxPercent: q.taxPercent,
      discountAmount: q.discountAmount,
      vatAmount: q.vatAmount,
      items: q.items.map((item) => ({
        itemType: item.itemType,
        productId: item.productId?.toString(),
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        totalAmount: item.totalAmount,
        remark: item.remark,
      })),

      approvalHistory: q.approvalHistory.map((history) => ({
        decision: history.decision,
        customerName: history.customerName,
        method: history.method,
        approvedBy: history.approvedBy.toString(),
        approvedAt: history.approvedAt.toISOString(),
        note: history.note,
      })),
      isDeleted: q.isDeleted,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}
