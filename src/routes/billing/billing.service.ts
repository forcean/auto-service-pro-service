import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { InvoiceRepository } from 'src/repository/invoice/invoice.repository';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { PartIssueRepository } from 'src/repository/part-issue/part-issue.repository';
import { ServiceHistoryRepository } from 'src/repository/service-history/service-history.repository';
import { AuthUser } from 'src/types/user.type';
import { QuotationService } from '../quotation/services/quotation.service';
import { WorkOrderService } from '../work-order/services/work-order.service';
import { TaskService } from '../task/task.service';
import { ETaskStatus } from '../task/enums/task.enum';
import { EQuotationStatus } from '../quotation/enums/quotation.enum';
import { EQuotationItemType } from '../quotation/enums/quotation.enum';
import { EInvoiceItemType, EInvoiceStatus } from './enums/billing.enum';
import {
  CreatePaymentDto,
  CreateRefundDto,
  InvoiceListQueryDto,
  PaymentListQueryDto,
  VoidInvoiceDto,
} from './dtos/billing.dto';
import { calculateLaborFactor, calculateLineAmount } from './billing.utils';
import { getPagination } from 'src/common/utils/pagination.util';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Injectable()
export class BillingService {
  constructor(
    @InjectConnection('autoservice') private readonly connection: Connection,
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(WorkOrderRepository)
    private readonly workOrderRepository: WorkOrderRepository,
    @Inject(PartIssueRepository)
    private readonly partIssueRepository: PartIssueRepository,
    @Inject(ServiceHistoryRepository)
    private readonly serviceHistoryRepository: ServiceHistoryRepository,
    @Inject(QuotationService)
    private readonly quotationService: QuotationService,
    @Inject(WorkOrderService)
    private readonly workOrderService: WorkOrderService,
    @Inject(TaskService) private readonly taskService: TaskService,
    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
  ) {}

  async createInvoice(workOrderId: string, user: AuthUser) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const workOrder: any =
          await this.workOrderService.getWorkOrderById(workOrderId);
        if (
          workOrder.status !== 'COMPLETED' &&
          workOrder.status !== 'READY_DELIVERY'
        ) {
          throw new BusinessException(
            '4001',
            'Work order must pass QC before invoicing',
          );
        }
        const tasks: any[] = await this.taskService.getTasksByWorkOrderNo(
          workOrder.workOrderNo,
        );
        if (
          !tasks.length ||
          tasks.some((task) => task.status !== ETaskStatus.FINISHED)
        ) {
          throw new BusinessException(
            '4001',
            'All work order tasks must be finished before invoicing',
          );
        }
        const laborFactor = calculateLaborFactor(tasks);
        if (
          await this.invoiceRepository.findByWorkOrderId(workOrderId, session)
        ) {
          throw new BusinessException(
            '4090',
            'Invoice already exists for this work order',
          );
        }
        if (!workOrder.currentQuotationId) {
          throw new BusinessException('4001', 'Approved quotation is required');
        }
        const quotation: any = await this.quotationService.getQuotationById(
          workOrder.currentQuotationId.toString(),
        );
        if (quotation.status !== EQuotationStatus.APPROVED) {
          throw new BusinessException(
            '4001',
            'Quotation must be approved before invoicing',
          );
        }

        const issues: any[] =
          await this.partIssueRepository.getPartIssueByWorkOrderNo(
            workOrder.workOrderNo,
            session,
          );
        const issuedParts = new Map<
          string,
          {
            quantity: number;
            unitPrice: number;
            description: string;
            issueNo: string;
            productId?: string;
            sku?: string;
          }
        >();
        for (const issue of issues) {
          if (issue.status === 'CANCELLED') continue;
          for (const item of issue.items ?? []) {
            if (item.issuedQty <= 0) continue;
            const key = item.productId.toString();
            const current = issuedParts.get(key);
            issuedParts.set(key, {
              quantity: (current?.quantity ?? 0) + item.issuedQty,
              unitPrice: Number(item.unitPrice ?? 0),
              description: item.productName,
              issueNo: current?.issueNo ?? issue.issueNo,
              productId: key,
              sku: item.sku,
            });
          }
        }

        const items: any[] = [];
        for (const quoteItem of quotation.items ?? []) {
          if (quoteItem.itemType === EQuotationItemType.PART) {
            const actual = issuedParts.get(
              quoteItem.productId?.toString() ?? '',
            );
            if (!actual) {
              throw new BusinessException(
                '4001',
                `Part has not been issued for ${quoteItem.sku}`,
              );
            }
            if (actual.quantity > quoteItem.quantity) {
              throw new BusinessException(
                '4001',
                `Issued quantity exceeds quotation for ${quoteItem.sku}`,
              );
            }
            const lineDiscount =
              Number(quoteItem.discountAmount ?? 0) *
              (actual.quantity / quoteItem.quantity);
            items.push({
              itemType: EInvoiceItemType.PART,
              productId: quoteItem.productId,
              sku: quoteItem.sku,
              description: actual.description || quoteItem.description,
              quantity: actual.quantity,
              unitPrice: quoteItem.unitPrice,
              discountAmount: lineDiscount,
              totalAmount: calculateLineAmount(
                actual.quantity,
                quoteItem.unitPrice,
                lineDiscount,
              ),
              sourcePartIssueNo: actual.issueNo,
            });
            issuedParts.delete(quoteItem.productId?.toString() ?? '');
          } else {
            const quantity =
              quoteItem.itemType === EQuotationItemType.LABOR
                ? Number((quoteItem.quantity * laborFactor).toFixed(2))
                : quoteItem.quantity;
            const discount =
              Number(quoteItem.discountAmount ?? 0) *
              (quantity / quoteItem.quantity);
            const invoiceQuantity = Math.max(quantity, 0.01);
            items.push({
              itemType: quoteItem.itemType,
              description: quoteItem.description,
              quantity: invoiceQuantity,
              unitPrice: quoteItem.unitPrice,
              discountAmount: discount,
              totalAmount: calculateLineAmount(
                invoiceQuantity,
                quoteItem.unitPrice,
                discount,
              ),
            });
          }
        }
        if (issuedParts.size > 0)
          throw new BusinessException(
            '4001',
            'Issued parts do not match the approved quotation',
          );

        const partTotal = items
          .filter((i) => i.itemType === EInvoiceItemType.PART)
          .reduce((sum, i) => sum + i.totalAmount, 0);
        const laborTotal = items
          .filter((i) => i.itemType === EInvoiceItemType.LABOR)
          .reduce((sum, i) => sum + i.totalAmount, 0);
        const serviceTotal = items
          .filter((i) => i.itemType === EInvoiceItemType.SERVICE)
          .reduce((sum, i) => sum + i.totalAmount, 0);
        const subtotal = partTotal + laborTotal + serviceTotal;
        const discountAmount = Number(quotation.discountAmount ?? 0);
        const vatAmount = quotation.includeVat
          ? ((subtotal - discountAmount) * Number(quotation.taxPercent ?? 7)) /
            100
          : 0;
        const invoiceNo = await this.documentNoService.generate(
          EDocumentType.INVOICE,
        );
        const vehicle: any = workOrder.vehicleId;
        result = await this.invoiceRepository.create(
          {
            invoiceNo,
            workOrderId,
            quotationId: quotation.id,
            workOrderNo: workOrder.workOrderNo,
            items,
            partTotal,
            laborTotal,
            serviceTotal,
            discountAmount,
            vatAmount,
            grandTotal: subtotal - discountAmount + vatAmount,
            status: EInvoiceStatus.ISSUED,
            billingParty: {
              name:
                vehicle?.billingName ||
                [vehicle?.firstname, vehicle?.lastname]
                  .filter(Boolean)
                  .join(' ') ||
                undefined,
              phone: vehicle?.phoneNumber,
              taxId: vehicle?.taxId,
              address: vehicle?.billingAddress,
              branchNo: vehicle?.branchNo,
            },
            vehicleSnapshot: {
              licensePlate: vehicle?.licensePlate,
              province: vehicle?.province,
              brand: vehicle?.vehicle?.brand,
              model: vehicle?.vehicle?.model,
            },
            auditEvents: [
              {
                action: 'ISSUED',
                referenceNo: invoiceNo,
                performedBy: user.publicId,
                occurredAt: new Date(),
              },
            ],
          },
          user,
          session,
        );
        if (!result)
          throw new BusinessException('5001', 'Failed to create invoice');
        await this.workOrderService.updateInvoice(
          workOrderId,
          result._id.toString(),
          user,
          session,
        );
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  async getInvoice(id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) throw new BusinessException('4040', 'Invoice not found');
    return invoice;
  }

  async listInvoices(query: InvoiceListQueryDto, sortBy?: SortCriterial | null) {
    return this.invoiceRepository.findAllPaginated(
      getPagination(query),
      query,
      sortBy,
    );
  }

  async getSummary() {
    return this.invoiceRepository.getSummary();
  }

  async getReadyToInvoiceWorkOrders() {
    const workOrders: any[] = await this.workOrderRepository.findBillingCandidates();
    return Promise.all(
      workOrders.map(async (workOrder) => {
        const blockers: string[] = [];
        if (await this.invoiceRepository.findByWorkOrderId(workOrder._id.toString())) {
          blockers.push('INVOICE_ALREADY_EXISTS');
        }
        const tasks: any[] = await this.taskService.getTasksByWorkOrderNo(
          workOrder.workOrderNo,
        );
        if (!tasks.length) blockers.push('NO_TASKS');
        else if (tasks.some((task) => task.status !== ETaskStatus.FINISHED))
          blockers.push('TASKS_NOT_FINISHED');

        if (!workOrder.currentQuotationId) {
          blockers.push('NO_QUOTATION');
        } else {
          try {
            const quotation: any = await this.quotationService.getQuotationById(
              workOrder.currentQuotationId.toString(),
            );
            if (quotation.status !== EQuotationStatus.APPROVED)
              blockers.push('QUOTATION_NOT_APPROVED');
            else if (!(await this.hasMatchingIssuedParts(workOrder, quotation)))
              blockers.push('PART_ISSUES_DO_NOT_MATCH_QUOTATION');
          } catch {
            blockers.push('QUOTATION_NOT_FOUND');
          }
        }
        return {
          ...workOrder,
          vehicle: workOrder.vehicleId,
          canCreateInvoice: blockers.length === 0,
          blockers,
        };
      }),
    );
  }

  async voidInvoice(invoiceId: string, dto: VoidInvoiceDto, user: AuthUser) {
    const invoice: any = await this.getInvoice(invoiceId);
    if (Number(invoice.paidAmount ?? 0) > 0) {
      throw new BusinessException(
        '4001',
        'Invoice with payment cannot be voided; use refund flow',
      );
    }
    const result = await this.invoiceRepository.voidInvoice(
      invoiceId,
      dto.reason,
      user,
    );
    if (!result)
      throw new BusinessException(
        '4001',
        'Invoice cannot be voided in its current status',
      );
    return result;
  }

  async refundPayment(invoiceId: string, dto: CreateRefundDto, user: AuthUser) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const invoice: any = await this.invoiceRepository.findById(
          invoiceId,
          session,
        );
        if (!invoice) throw new BusinessException('4040', 'Invoice not found');
        const refundable =
          Number(invoice.paidAmount ?? 0) - Number(invoice.refundedAmount ?? 0);
        if (dto.amount > refundable + 0.005)
          throw new BusinessException(
            '4001',
            'Refund exceeds refundable amount',
          );
        const refundedAmount = Number(
          (Number(invoice.refundedAmount ?? 0) + dto.amount).toFixed(2),
        );
        const status =
          refundedAmount >= Number(invoice.paidAmount)
            ? EInvoiceStatus.REFUNDED
            : EInvoiceStatus.PARTIALLY_REFUNDED;
        const refundNo = await this.documentNoService.generate(
          EDocumentType.REFUND,
        );
        result = await this.invoiceRepository.addRefund(
          invoiceId,
          { ...dto, refundNo },
          refundedAmount,
          status,
          user,
          session,
        );
        if (!result)
          throw new BusinessException('5003', 'Failed to record refund');
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  async getReceipt(invoiceId: string) {
    const invoice: any = await this.getInvoice(invoiceId);
    if (Number(invoice.paidAmount ?? 0) <= 0)
      throw new BusinessException('4001', 'Receipt is available after payment');
    const paymentNo = invoice.payments?.[invoice.payments.length - 1]?.paymentNo;
    return this.getPaymentReceipt(paymentNo);
  }

  async getPrintableReceipt(invoiceId: string) {
    const receipt = await this.getReceipt(invoiceId);
    const escapeHtml = (value: unknown) =>
      String(value ?? '').replace(
        /[&<>'"]/g,
        (char) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          })[char] as string,
      );
    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(receipt.receiptNo)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:32px auto;color:#222}h1{text-align:center}.meta{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:right}td:first-child,th:first-child{text-align:left}.total{font-size:1.2em;font-weight:bold}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print</button><h1>Receipt</h1><div class="meta"><span>Receipt: ${escapeHtml(receipt.receiptNo)}</span><span>Invoice: ${escapeHtml(receipt.invoiceNo)}</span></div><p>Work Order: ${escapeHtml(receipt.workOrderNo)}</p><p>Customer: ${escapeHtml(receipt.billingParty?.name)}</p><table><tr><th>Payment</th><th>Method</th><th>Reference</th><th>Amount</th></tr><tr><td>${escapeHtml(receipt.payment.paymentNo)}</td><td>${escapeHtml(receipt.payment.method)}</td><td>${escapeHtml(receipt.payment.reference)}</td><td>${Number(receipt.payment.amount).toFixed(2)}</td></tr><tr class="total"><td colspan="3">Received</td><td>${Number(receipt.payment.amount).toFixed(2)}</td></tr></table></body></html>`;
  }

  async getPrintableInvoice(invoiceId: string) {
    const invoice: any = await this.getInvoice(invoiceId);
    const escapeHtml = (value: unknown) =>
      String(value ?? '').replace(
        /[&<>'"]/g,
        (char) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          })[char] as string,
      );
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoiceNo)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:32px auto;color:#222}h1{text-align:center}.meta{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:right}td:first-child,th:first-child{text-align:left}.total{font-weight:bold}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print</button><h1>Invoice</h1><div class="meta"><span>Invoice: ${escapeHtml(invoice.invoiceNo)}</span><span>Status: ${escapeHtml(invoice.status)}</span></div><p>Work Order: ${escapeHtml(invoice.workOrderNo)}</p><table><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>${(invoice.items ?? []).map((item: any) => `<tr><td>${escapeHtml(item.description)}</td><td>${Number(item.quantity)}</td><td>${Number(item.unitPrice).toFixed(2)}</td><td>${Number(item.totalAmount).toFixed(2)}</td></tr>`).join('')}<tr class="total"><td colspan="3">Subtotal</td><td>${(Number(invoice.partTotal) + Number(invoice.laborTotal) + Number(invoice.serviceTotal)).toFixed(2)}</td></tr><tr><td colspan="3">Discount</td><td>-${Number(invoice.discountAmount).toFixed(2)}</td></tr><tr><td colspan="3">VAT</td><td>${Number(invoice.vatAmount).toFixed(2)}</td></tr><tr class="total"><td colspan="3">Grand total</td><td>${Number(invoice.grandTotal).toFixed(2)}</td></tr></table></body></html>`;
  }

  async getServiceHistory(invoiceId: string) {
    const invoice: any = await this.getInvoice(invoiceId);
    const history = await this.serviceHistoryRepository.findByWorkOrder(
      invoice.workOrderId.toString(),
    );
    if (!history)
      throw new BusinessException('4040', 'Service history not found');
    return history;
  }

  async getAuditEvents(invoiceId: string) {
    const invoice: any = await this.getInvoice(invoiceId);
    return [...(invoice.auditEvents ?? [])].sort(
      (a: any, b: any) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }

  async listPayments(query: PaymentListQueryDto) {
    return this.invoiceRepository.findPaymentsPaginated(getPagination(query), query);
  }

  async getPaymentReceipt(paymentNo: string) {
    const invoice: any = await this.invoiceRepository.findPaymentByNo(paymentNo);
    if (!invoice) throw new BusinessException('4040', 'Payment not found');
    const payment = invoice.payments?.find(
      (item: any) => item.paymentNo === paymentNo,
    );
    if (!payment) throw new BusinessException('4040', 'Payment not found');
    return {
      receiptNo: payment.paymentNo,
      invoiceId: invoice._id,
      invoiceNo: invoice.invoiceNo,
      workOrderNo: invoice.workOrderNo,
      billingParty: invoice.billingParty,
      vehicleSnapshot: invoice.vehicleSnapshot,
      payment,
      issuedAt: payment.paidAt,
    };
  }

  async getPrintablePaymentReceipt(paymentNo: string) {
    const receipt = await this.getPaymentReceipt(paymentNo);
    return this.getPrintableReceiptByData(receipt);
  }

  async receivePayment(
    invoiceId: string,
    dto: CreatePaymentDto,
    user: AuthUser,
  ) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const invoice: any = await this.invoiceRepository.findById(
          invoiceId,
          session,
        );
        if (!invoice) throw new BusinessException('4040', 'Invoice not found');
        if (invoice.status === EInvoiceStatus.VOID)
          throw new BusinessException(
            '4001',
            'Void invoice cannot receive payment',
          );
        const outstanding =
          Number(invoice.grandTotal) - Number(invoice.paidAmount ?? 0);
        if (dto.amount > outstanding + 0.005)
          throw new BusinessException(
            '4001',
            'Payment exceeds invoice balance',
          );
        const paidAmount = Number(
          (Number(invoice.paidAmount ?? 0) + dto.amount).toFixed(2),
        );
        const status =
          paidAmount >= Number(invoice.grandTotal)
            ? EInvoiceStatus.PAID
            : EInvoiceStatus.PARTIALLY_PAID;
        const paymentNo = await this.documentNoService.generate(
          EDocumentType.PAYMENT,
        );
        result = await this.invoiceRepository.addPayment(
          invoiceId,
          { ...dto, paymentNo },
          paidAmount,
          status,
          user,
          session,
        );
        if (!result)
          throw new BusinessException('5002', 'Failed to record payment');
        if (status === EInvoiceStatus.PAID) {
          const workOrder: any = await this.workOrderService.getWorkOrderById(
            invoice.workOrderId.toString(),
          );
          if (workOrder.status !== 'COMPLETED') {
            await this.workOrderService.closeWorkOrder(
              invoice.workOrderNo,
              user,
              session,
            );
          }
          await this.serviceHistoryRepository.create(
            {
              workOrderId: invoice.workOrderId,
              vehicleId: workOrder.vehicleId,
              invoiceId: invoice._id,
              workOrderNo: invoice.workOrderNo,
              mileage: workOrder.mileage,
              items: result.items.map((item: any) => ({
                description: item.description,
                quantity: item.quantity,
                amount: item.totalAmount,
              })),
              totalAmount: result.grandTotal,
            },
            user,
            session,
          );
        }
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  private async hasMatchingIssuedParts(workOrder: any, quotation: any) {
    const issues: any[] = await this.partIssueRepository.getPartIssueByWorkOrderNo(
      workOrder.workOrderNo,
    );
    const issuedParts = new Map<string, number>();
    for (const issue of issues) {
      if (issue.status === 'CANCELLED') continue;
      for (const item of issue.items ?? []) {
        if (item.issuedQty <= 0) continue;
        const key = item.productId.toString();
        issuedParts.set(key, (issuedParts.get(key) ?? 0) + item.issuedQty);
      }
    }
    for (const quoteItem of quotation.items ?? []) {
      if (quoteItem.itemType !== EQuotationItemType.PART) continue;
      const key = quoteItem.productId?.toString() ?? '';
      const issued = issuedParts.get(key);
      if (issued === undefined) return false;
      if (issued > quoteItem.quantity) return false;
      issuedParts.delete(key);
    }
    return issuedParts.size === 0;
  }

  private async getPrintableReceiptByData(receipt: any) {
    const escapeHtml = (value: unknown) =>
      String(value ?? '').replace(
        /[&<>'"]/g,
        (char) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
          })[char] as string,
      );
    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(receipt.receiptNo)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:32px auto;color:#222}h1{text-align:center}.meta{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:right}td:first-child,th:first-child{text-align:left}.total{font-size:1.2em;font-weight:bold}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print</button><h1>Receipt</h1><div class="meta"><span>Receipt: ${escapeHtml(receipt.receiptNo)}</span><span>Invoice: ${escapeHtml(receipt.invoiceNo)}</span></div><p>Work Order: ${escapeHtml(receipt.workOrderNo)}</p><p>Customer: ${escapeHtml(receipt.billingParty?.name)}</p><table><tr><th>Method</th><th>Reference</th><th>Amount</th></tr><tr><td>${escapeHtml(receipt.payment.method)}</td><td>${escapeHtml(receipt.payment.reference)}</td><td>${Number(receipt.payment.amount).toFixed(2)}</td></tr></table></body></html>`;
  }
}
