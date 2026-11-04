import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { EInvoiceItemType, EInvoiceStatus, EPaymentMethod } from 'src/routes/billing/enums/billing.enum';
import { InvoiceEntity } from 'src/repository/invoice/invoice.schema';
import { ProductsEntity } from 'src/repository/products/products.schema';
import { WorkOrderTaskEntity } from 'src/repository/work-order-task/work-order-task.schema';

type AmountByMethod = { _id: EPaymentMethod; amount: number; count: number };

@Injectable()
export class OperationsRepository {
  constructor(
    @InjectModel(InvoiceEntity.name, 'autoservice')
    private readonly invoiceModel: Model<InvoiceEntity>,
    @InjectModel(ProductsEntity.name, 'autoservice')
    private readonly productModel: Model<ProductsEntity>,
    @InjectModel(WorkOrderTaskEntity.name, 'autoservice')
    private readonly taskModel: Model<WorkOrderTaskEntity>,
  ) {}

  async getDailyReport(from: Date, to: Date) {
    const salesFilter = {
      isDeleted: false,
      status: { $ne: EInvoiceStatus.VOID },
      createdAt: { $gte: from, $lt: to },
    };
    const paymentFilter = { isDeleted: false };

    const [invoices, payments, refunds, technicianRows] = await Promise.all([
      this.invoiceModel.find(salesFilter).select({
        invoiceNo: 1,
        partTotal: 1,
        laborTotal: 1,
        serviceTotal: 1,
        discountAmount: 1,
        vatAmount: 1,
        grandTotal: 1,
        items: 1,
      }).lean(),
      this.invoiceModel.aggregate<AmountByMethod>([
        { $match: paymentFilter },
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: from, $lt: to } } },
        {
          $group: {
            _id: '$payments.method',
            amount: { $sum: '$payments.amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.invoiceModel.aggregate<AmountByMethod>([
        { $match: paymentFilter },
        { $unwind: '$refunds' },
        { $match: { 'refunds.refundedAt': { $gte: from, $lt: to } } },
        {
          $group: {
            _id: '$refunds.method',
            amount: { $sum: '$refunds.amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.taskModel.aggregate<{
        _id: string;
        completedTasks: number;
        actualMinutes: number;
      }>([
        {
          $match: {
            isDeleted: false,
            status: 'FINISHED',
            finishedAt: { $gte: from, $lt: to },
          },
        },
        { $unwind: { path: '$mechanics', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$mechanics.mechanicName', 'ไม่ระบุช่าง'] },
            completedTasks: { $sum: 1 },
            actualMinutes: { $sum: { $ifNull: ['$actualMinute', 0] } },
          },
        },
        { $sort: { completedTasks: -1, actualMinutes: -1, _id: 1 } },
      ]),
    ]);

    const productIds = Array.from(new Set(
      invoices.flatMap((invoice) => invoice.items
        .filter((item) => item.itemType === EInvoiceItemType.PART && item.productId)
        .map((item) => String(item.productId))),
    ));
    const products = productIds.length
      ? await this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } })
          .select({ price: 1 })
          .lean()
      : [];
    const costByProduct = new Map(products.map((product) => [String(product._id), product.price?.cost ?? 0]));

    const sales = invoices.reduce(
      (total, invoice) => ({
        invoiceCount: total.invoiceCount + 1,
        partSales: total.partSales + (invoice.partTotal ?? 0),
        laborSales: total.laborSales + (invoice.laborTotal ?? 0),
        serviceSales: total.serviceSales + (invoice.serviceTotal ?? 0),
        discount: total.discount + (invoice.discountAmount ?? 0),
        vat: total.vat + (invoice.vatAmount ?? 0),
        total: total.total + (invoice.grandTotal ?? 0),
        partCostEstimate: total.partCostEstimate + invoice.items.reduce(
          (cost, item) => cost + (item.itemType === EInvoiceItemType.PART
            ? (costByProduct.get(String(item.productId)) ?? 0) * item.quantity
            : 0),
          0,
        ),
      }),
      { invoiceCount: 0, partSales: 0, laborSales: 0, serviceSales: 0, discount: 0, vat: 0, total: 0, partCostEstimate: 0 },
    );

    const methods = Object.values(EPaymentMethod).reduce<Record<string, number>>(
      (result, method) => ({ ...result, [method]: 0 }),
      {},
    );
    const refundsByMethod = { ...methods };
    let unclassifiedRefunds = 0;
    for (const row of payments) methods[row._id] = row.amount;
    for (const row of refunds) {
      if (row._id && refundsByMethod[row._id] !== undefined) refundsByMethod[row._id] = row.amount;
      else unclassifiedRefunds += row.amount;
    }

    const totalReceived = Object.values(methods).reduce((sum, amount) => sum + amount, 0);
    const totalRefunded = Object.values(refundsByMethod).reduce((sum, amount) => sum + amount, 0) + unclassifiedRefunds;
    return {
      sales: {
        ...sales,
        partGrossProfitEstimate: sales.partSales - sales.partCostEstimate,
        grossProfitEstimate: sales.total - sales.partCostEstimate,
        costBasis: 'CURRENT_CATALOG_COST',
      },
      receipts: {
        totalReceived,
        byMethod: methods,
        paymentCount: payments.reduce((sum, row) => sum + row.count, 0),
      },
      refunds: {
        totalRefunded,
        byMethod: refundsByMethod,
        unclassifiedRefunds,
      },
      cashDrawer: {
        cashPayments: methods[EPaymentMethod.CASH] ?? 0,
        cashRefunds: refundsByMethod[EPaymentMethod.CASH] ?? 0,
        unclassifiedRefunds,
      },
      technicians: technicianRows.map((row) => ({
        mechanicName: row._id,
        completedTasks: row.completedTasks,
        actualMinutes: row.actualMinutes,
      })),
    };
  }
}
