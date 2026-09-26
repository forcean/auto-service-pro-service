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
import { WorkOrderPaymentRepository } from 'src/repository/work-order-payment/work-order-payment.repository';
import { AuthUser } from 'src/types/user.type';
import { QuotationService } from '../quotation/services/quotation.service';
import { WorkOrderService } from '../work-order/services/work-order.service';
import { TaskService } from '../task/task.service';
import { ETaskStatus } from '../task/enums/task.enum';
import { EQuotationItemType, EQuotationStatus } from '../quotation/enums/quotation.enum';
import {
  EInvoiceItemType,
  EInvoiceStatus,
  EWorkOrderPaymentType,
} from './enums/billing.enum';
import {
  CreatePaymentDto,
  CreateRefundDto,
  CreateWorkOrderPaymentDto,
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
    @Inject(WorkOrderPaymentRepository)
    private readonly workOrderPaymentRepository: WorkOrderPaymentRepository,
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
        const grandTotal = subtotal - discountAmount + vatAmount;
        const availablePrepayments =
          await this.workOrderPaymentRepository.findAvailableByWorkOrderNo(
            workOrder.workOrderNo,
            session,
          );
        let remainingToApply = grandTotal;
        const appliedPrepayments = availablePrepayments
          .map((payment: any) => {
            const available = Number(payment.amount) - Number(payment.allocatedAmount ?? 0);
            const amount = Math.min(Math.max(available, 0), remainingToApply);
            remainingToApply -= amount;
            return amount > 0
              ? {
                  paymentId: payment._id.toString(),
                  paymentNo: payment.paymentNo,
                  type: payment.type,
                  amount,
                }
              : null;
          })
          .filter(Boolean) as Array<{
          paymentId: string;
          paymentNo: string;
          type: EWorkOrderPaymentType;
          amount: number;
        }>;
        const prepaymentAppliedAmount = Number(
          appliedPrepayments.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
        );
        const initialStatus =
          prepaymentAppliedAmount >= grandTotal
            ? EInvoiceStatus.PAID
            : prepaymentAppliedAmount > 0
              ? EInvoiceStatus.PARTIALLY_PAID
              : EInvoiceStatus.ISSUED;
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
            grandTotal,
            paidAmount: prepaymentAppliedAmount,
            prepaymentAppliedAmount,
            appliedPrepayments: appliedPrepayments.map(({ paymentNo, type, amount }) => ({ paymentNo, type, amount })),
            status: initialStatus,
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
              ...appliedPrepayments.map(({ paymentNo, amount }) => ({
                action: 'PREPAYMENT_APPLIED' as const,
                referenceNo: paymentNo,
                note: `Applied credit ${amount.toFixed(2)}`,
                performedBy: user.publicId,
                occurredAt: new Date(),
              })),
            ],
          },
          user,
          session,
        );
        if (!result)
          throw new BusinessException('5001', 'Failed to create invoice');
        for (const payment of appliedPrepayments) {
          const allocated = await this.workOrderPaymentRepository.allocateAmount(
            payment.paymentId,
            payment.amount,
            session,
          );
          if (!allocated)
            throw new BusinessException('4090', 'Prepayment balance changed; please retry');
        }
        await this.workOrderService.updateInvoice(
          workOrderId,
          result._id.toString(),
          user,
          session,
        );
        if (initialStatus === EInvoiceStatus.PAID) {
          await this.workOrderService.closeWorkOrder(
            workOrder.workOrderNo,
            user,
            session,
          );
          await this.serviceHistoryRepository.create(
            {
              workOrderId: workOrder._id,
              vehicleId: workOrder.vehicleId,
              invoiceId: result._id,
              workOrderNo: workOrder.workOrderNo,
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

  async getInvoice(id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) throw new BusinessException('4040', 'Invoice not found');
    return invoice;
  }

  async recordWorkOrderPayment(
    workOrderNo: string,
    dto: CreateWorkOrderPaymentDto,
    user: AuthUser,
  ) {
    const workOrder: any = await this.workOrderService.getWorkOrderByNo(workOrderNo);
    if (!workOrder) throw new BusinessException('4040', 'Work order not found');
    const acceptedStatuses = new Set([
      'WAITING_ASSIGNMENT',
      'IN_PROGRESS',
      'WAITING_ADDITIONAL_APPROVAL',
      'WAITING_QC',
      'REWORK',
      'QC_APPROVED',
      'READY_DELIVERY',
    ]);
    if (!acceptedStatuses.has(workOrder.status)) {
      throw new BusinessException(
        '4001',
        'Prepayment is available after quotation approval and before work order completion',
      );
    }
    const paymentNo = await this.documentNoService.generate(EDocumentType.PAYMENT);
    return this.workOrderPaymentRepository.create(
      {
        ...dto,
        paymentNo,
        workOrderId: workOrder._id.toString(),
        workOrderNo: workOrder.workOrderNo,
      },
      user,
    );
  }

  getWorkOrderPayments(workOrderNo: string) {
    return this.workOrderPaymentRepository.findByWorkOrderNo(workOrderNo);
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
    const currency = (value: unknown) =>
      Number(value ?? 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const issuedAt = invoice.createdAt
      ? new Intl.DateTimeFormat('th-TH', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(invoice.createdAt))
      : '-';
    const statusLabel: Record<string, string> = {
      ISSUED: 'รอชำระเงิน',
      PARTIALLY_PAID: 'ชำระบางส่วน',
      PAID: 'ชำระครบแล้ว',
      VOID: 'ยกเลิกเอกสาร',
      PARTIALLY_REFUNDED: 'คืนเงินบางส่วน',
      REFUNDED: 'คืนเงินแล้ว',
    };
    const itemTypeLabel: Record<string, string> = {
      PART: 'อะไหล่',
      LABOR: 'ค่าแรง',
      SERVICE: 'บริการ',
    };
    const billingAddress = [
      invoice.billingParty?.address,
      invoice.billingParty?.branchNo
        ? `สาขา ${invoice.billingParty.branchNo}`
        : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    const subtotal =
      Number(invoice.partTotal ?? 0) +
      Number(invoice.laborTotal ?? 0) +
      Number(invoice.serviceTotal ?? 0);
    const prepaymentAppliedAmount = Number(invoice.prepaymentAppliedAmount ?? 0);
    const outstandingAmount = Math.max(
      0,
      Number(invoice.grandTotal ?? 0) - Number(invoice.paidAmount ?? 0),
    );
    const itemRows = (invoice.items ?? [])
      .map(
        (item: any, index: number) => `
          <tr>
            <td class="item-index">${index + 1}</td>
            <td>
              <strong>${escapeHtml(item.description)}</strong>
              <small>${escapeHtml(item.sku || itemTypeLabel[item.itemType] || '')}</small>
            </td>
            <td class="number">${escapeHtml(item.quantity)}</td>
            <td class="number">${currency(item.unitPrice)}</td>
            <td class="number amount">${currency(item.totalAmount)}</td>
          </tr>`,
      )
      .join('');

    return `<!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Invoice ${escapeHtml(invoice.invoiceNo)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #e8edf3; color: #172033; font-family: 'Sarabun', 'Noto Sans Thai', Tahoma, Arial, sans-serif; font-size: 13px; line-height: 1.45; }
            .toolbar { width: 210mm; margin: 18px auto 10px; display: flex; justify-content: flex-end; }
            .print-button { border: 0; border-radius: 9px; background: #0f9d6e; color: #fff; cursor: pointer; font: inherit; font-weight: 700; padding: 10px 18px; box-shadow: 0 4px 12px rgba(15, 157, 110, .2); }
            .paper { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto 24px; padding: 17mm 16mm 14mm; background: #fff; box-shadow: 0 10px 32px rgba(15, 23, 42, .14); overflow: hidden; }
            .paper::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 7px; background: linear-gradient(90deg, #059669, #14b8a6); }
            .heading { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 22px; border-bottom: 1px solid #dbe4ef; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand-mark { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 13px; background: #e8faf2; color: #07865f; font-size: 20px; font-weight: 800; }
            .brand-name { margin: 0; color: #101828; font-size: 19px; font-weight: 800; letter-spacing: -.4px; }
            .brand-subtitle { margin: 2px 0 0; color: #667085; font-size: 11px; }
            .document-title { text-align: right; }
            .document-title h1 { margin: 0; color: #0f172a; font-size: 27px; letter-spacing: .8px; line-height: 1; }
            .document-title p { margin: 6px 0 0; color: #667085; font-size: 11px; }
            .status { display: inline-block; margin-top: 9px; border-radius: 999px; background: #eafaf2; color: #047857; font-size: 10px; font-weight: 800; letter-spacing: .3px; padding: 4px 9px; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 22px 0; }
            .info-card { min-height: 118px; padding: 15px; border: 1px solid #dce5ef; border-radius: 12px; background: #fcfdff; }
            .info-card h2 { margin: 0 0 10px; color: #0f9d6e; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
            .info-card strong { display: block; color: #172033; font-size: 14px; }
            .info-card p { margin: 3px 0 0; color: #526176; font-size: 11px; }
            .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; margin: 6px 0 0; }
            .invoice-meta div { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dashed #dce5ef; padding: 4px 0; color: #667085; font-size: 11px; }
            .invoice-meta b { color: #344054; font-weight: 700; text-align: right; }
            table { width: 100%; border-collapse: collapse; }
            thead th { background: #0f766e; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .25px; padding: 10px 9px; text-align: left; }
            thead th:first-child { border-radius: 8px 0 0 8px; text-align: center; }
            thead th:last-child { border-radius: 0 8px 8px 0; }
            tbody td { border-bottom: 1px solid #e7edf4; padding: 11px 9px; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f9fbfd; }
            tbody strong { display: block; color: #172033; font-size: 12px; }
            tbody small { display: block; margin-top: 2px; color: #7b8798; font-size: 10px; }
            .item-index { width: 32px; color: #7b8798; text-align: center; }
            .number { text-align: right; white-space: nowrap; }
            .amount { color: #0f172a; font-weight: 700; }
            .summary-wrap { display: flex; justify-content: flex-end; margin-top: 18px; }
            .summary { width: 280px; }
            .summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 5px 2px; color: #526176; }
            .summary-row b { color: #344054; }
            .summary-row.discount b { color: #d92d20; }
            .grand-total { display: flex; justify-content: space-between; gap: 16px; margin-top: 7px; border-radius: 10px; background: #e8faf2; color: #065f46; font-size: 15px; font-weight: 800; padding: 11px 12px; }
            .paid-note { margin-top: 20px; border: 1px solid #b7ebd3; border-radius: 10px; background: #f0fdf7; color: #16634a; padding: 11px 13px; font-size: 11px; }
            .footer { position: absolute; right: 16mm; bottom: 11mm; left: 16mm; display: flex; justify-content: space-between; border-top: 1px solid #dce5ef; color: #98a2b3; font-size: 9px; padding-top: 9px; }
            @media print { body { background: #fff; } .toolbar { display: none; } .paper { width: auto; min-height: 0; margin: 0; padding: 5mm 4mm 14mm; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="toolbar"><button class="print-button" onclick="window.print()">พิมพ์เอกสาร</button></div>
          <main class="paper">
            <header class="heading">
              <div class="brand"><div class="brand-mark">A</div><div><p class="brand-name">AutoServicePro</p><p class="brand-subtitle">Automotive Workshop ERP</p></div></div>
              <div class="document-title"><h1>INVOICE</h1><p>ใบแจ้งหนี้ / ใบกำกับค่าบริการ</p><span class="status">${escapeHtml(statusLabel[invoice.status] || invoice.status)}</span></div>
            </header>
            <section class="parties">
              <article class="info-card"><h2>Billing to</h2><strong>${escapeHtml(invoice.billingParty?.name || '-')}</strong><p>${escapeHtml(invoice.billingParty?.phone || '')}</p><p>${escapeHtml(invoice.billingParty?.taxId ? `เลขประจำตัวผู้เสียภาษี ${invoice.billingParty.taxId}` : '')}</p><p>${escapeHtml(billingAddress)}</p></article>
              <article class="info-card"><h2>Vehicle & document</h2><strong>${escapeHtml(invoice.vehicleSnapshot?.licensePlate || '-')} ${escapeHtml(invoice.vehicleSnapshot?.province || '')}</strong><p>${escapeHtml([invoice.vehicleSnapshot?.brand, invoice.vehicleSnapshot?.model].filter(Boolean).join(' ') || 'ไม่ระบุรุ่นรถ')}</p><div class="invoice-meta"><div><span>เลขที่ Invoice</span><b>${escapeHtml(invoice.invoiceNo)}</b></div><div><span>เลขที่ใบงาน</span><b>${escapeHtml(invoice.workOrderNo)}</b></div><div><span>วันที่ออกเอกสาร</span><b>${escapeHtml(issuedAt)}</b></div><div><span>สถานะ</span><b>${escapeHtml(statusLabel[invoice.status] || invoice.status)}</b></div></div></article>
            </section>
            <table><thead><tr><th>#</th><th>รายการ</th><th class="number">จำนวน</th><th class="number">ราคา/หน่วย</th><th class="number">จำนวนเงิน</th></tr></thead><tbody>${itemRows || '<tr><td colspan="5" style="text-align:center;color:#667085">ไม่มีรายการ</td></tr>'}</tbody></table>
            <section class="summary-wrap"><div class="summary"><div class="summary-row"><span>ยอดรวมก่อนส่วนลด</span><b>${currency(subtotal)}</b></div><div class="summary-row discount"><span>ส่วนลด</span><b>− ${currency(invoice.discountAmount)}</b></div><div class="summary-row"><span>ภาษีมูลค่าเพิ่ม (VAT)</span><b>${currency(invoice.vatAmount)}</b></div><div class="grand-total"><span>ยอดสุทธิ</span><span>฿ ${currency(invoice.grandTotal)}</span></div>${prepaymentAppliedAmount > 0 ? `<div class="summary-row" style="margin-top:8px"><span>เครดิตมัดจำ/ชำระระหว่างซ่อม</span><b style="color:#0284c7">− ${currency(prepaymentAppliedAmount)}</b></div>` : ''}<div class="summary-row" style="border-top:1px solid #dce5ef;margin-top:6px;padding-top:9px"><span>ยอดคงเหลือที่ต้องชำระ</span><b style="font-size:14px;color:${outstandingAmount > 0 ? '#b45309' : '#047857'}">฿ ${currency(outstandingAmount)}</b></div></div></section>
            ${invoice.status === 'PAID' ? '<div class="paid-note"><strong>ชำระเงินครบถ้วนแล้ว</strong> · ระบบได้ปิดใบสั่งงานและบันทึกประวัติการซ่อมเรียบร้อย</div>' : ''}
            <footer class="footer"><span>เอกสารนี้สร้างจากระบบ AutoServicePro</span><span>Invoice ${escapeHtml(invoice.invoiceNo)}</span></footer>
          </main>
        </body>
      </html>`;
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
