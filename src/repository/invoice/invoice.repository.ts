import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  CreatePaymentDto,
  CreateRefundDto,
} from 'src/routes/billing/dtos/billing.dto';
import {
  EInvoiceStatus,
  EPaymentMethod,
} from 'src/routes/billing/enums/billing.enum';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import {
  InvoiceListQueryDto,
  PaymentListQueryDto,
} from 'src/routes/billing/dtos/billing.dto';
import { InvoiceDocument, InvoiceEntity } from './invoice.schema';

type PageInput = { page: number; limit: number; skip: number };

@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectModel(InvoiceEntity.name, 'autoservice')
    private readonly model: Model<InvoiceDocument>,
  ) {}

  async create(
    payload: Record<string, unknown>,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [invoice] = await this.model.create(
      [{ ...payload, createdBy: new Types.ObjectId(user.publicId) }],
      { session },
    );
    return invoice;
  }

  async findById(id: string, session?: ClientSession) {
    return this.model
      .findOne({ _id: id, isDeleted: false })
      .session(session ?? null)
      .lean();
  }

  async findByWorkOrderId(workOrderId: string, session?: ClientSession) {
    return this.model
      .findOne({
        workOrderId: new Types.ObjectId(workOrderId),
        isDeleted: false,
      })
      .session(session ?? null)
      .lean();
  }

  async addPayment(
    id: string,
    payment: CreatePaymentDto & { paymentNo: string },
    paidAmount: number,
    status: EInvoiceStatus,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
          status: { $nin: [EInvoiceStatus.PAID, EInvoiceStatus.VOID] },
        },
        {
          $push: {
            payments: {
              ...payment,
              receivedBy: new Types.ObjectId(user.publicId),
            },
            auditEvents: {
              action: 'PAYMENT_RECEIVED',
              referenceNo: payment.paymentNo,
              note: payment.note,
              performedBy: new Types.ObjectId(user.publicId),
            },
          },
          $set: {
            paidAmount,
            status,
            updatedBy: new Types.ObjectId(user.publicId),
          },
        },
        { new: true, session },
      )
      .lean();
  }

  async findAllPaginated(
    pagination: PageInput,
    query: InvoiceListQueryDto,
    sortBy?: SortCriterial | null,
  ) {
    const filter = this.buildInvoiceFilter(query);
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sortBy ?? { createdAt: 'desc' })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data,
    };
  }

  async getSummary() {
    const rows = await this.model.aggregate<{
      _id: EInvoiceStatus;
      count: number;
      grandTotal: number;
      paidAmount: number;
      refundedAmount: number;
    }>([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          grandTotal: { $sum: '$grandTotal' },
          paidAmount: { $sum: '$paidAmount' },
          refundedAmount: { $sum: '$refundedAmount' },
        },
      },
    ]);
    const byStatus = rows.reduce<Record<string, number>>((result, row) => {
      result[row._id] = row.count;
      return result;
    }, {});
    const totalInvoices = rows.reduce((sum, row) => sum + row.count, 0);
    const totalAmount = rows.reduce((sum, row) => sum + row.grandTotal, 0);
    const paidAmount = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    const refundedAmount = rows.reduce(
      (sum, row) => sum + row.refundedAmount,
      0,
    );
    const outstandingAmount = rows
      .filter((row) =>
        [EInvoiceStatus.ISSUED, EInvoiceStatus.PARTIALLY_PAID].includes(
          row._id,
        ),
      )
      .reduce((sum, row) => sum + row.grandTotal - row.paidAmount, 0);
    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      refundedAmount,
      outstandingAmount,
      byStatus,
    };
  }

  async voidInvoice(id: string, reason: string, user: AuthUser) {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
          status: {
            $in: [EInvoiceStatus.ISSUED, EInvoiceStatus.PARTIALLY_PAID],
          },
        },
        {
          $push: {
            auditEvents: {
              action: 'VOIDED',
              note: reason,
              performedBy: new Types.ObjectId(user.publicId),
            },
          },
          $set: {
            status: EInvoiceStatus.VOID,
            updatedBy: new Types.ObjectId(user.publicId),
          },
        },
        { new: true },
      )
      .lean();
  }

  async addRefund(
    id: string,
    refund: CreateRefundDto & { refundNo: string },
    refundedAmount: number,
    status: EInvoiceStatus,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
          status: {
            $in: [EInvoiceStatus.PAID, EInvoiceStatus.PARTIALLY_REFUNDED],
          },
        },
        {
          $push: {
            refunds: {
              ...refund,
              refundedBy: new Types.ObjectId(user.publicId),
            },
            auditEvents: {
              action: 'REFUNDED',
              referenceNo: refund.refundNo,
              note: refund.reason,
              performedBy: new Types.ObjectId(user.publicId),
            },
          },
          $set: {
            refundedAmount,
            status,
            updatedBy: new Types.ObjectId(user.publicId),
          },
        },
        { new: true, session },
      )
      .lean();
  }

  async findPaymentByNo(paymentNo: string) {
    return this.model
      .findOne({ isDeleted: false, 'payments.paymentNo': paymentNo })
      .lean();
  }

  async findPaymentsPaginated(pagination: PageInput, query: PaymentListQueryDto) {
    const match: FilterQuery<InvoiceEntity> = { isDeleted: false };
    const paymentMatch: Record<string, unknown> = {};
    if (query.method) paymentMatch['payments.method'] = query.method;
    if (query.paidFrom || query.paidTo) {
      paymentMatch['payments.paidAt'] = {
        ...(query.paidFrom ? { $gte: new Date(query.paidFrom) } : {}),
        ...(query.paidTo
          ? { $lte: new Date(`${query.paidTo}T23:59:59.999Z`) }
          : {}),
      };
    }
    if (query.keyword?.trim()) {
      const keyword = new RegExp(this.escapeRegex(query.keyword.trim()), 'i');
      paymentMatch.$or = [
        { invoiceNo: keyword },
        { workOrderNo: keyword },
        { 'billingParty.name': keyword },
        { 'payments.paymentNo': keyword },
        { 'payments.reference': keyword },
      ];
    }
    const pipeline = [
      { $match: match },
      { $unwind: '$payments' },
      ...(Object.keys(paymentMatch).length ? [{ $match: paymentMatch }] : []),
      { $sort: { 'payments.paidAt': -1 as const } },
      {
        $project: {
          _id: 0,
          invoiceId: '$_id',
          invoiceNo: 1,
          workOrderNo: 1,
          billingParty: 1,
          vehicleSnapshot: 1,
          paymentNo: '$payments.paymentNo',
          amount: '$payments.amount',
          method: '$payments.method',
          reference: '$payments.reference',
          note: '$payments.note',
          paidAt: '$payments.paidAt',
          receivedBy: '$payments.receivedBy',
        },
      },
    ];
    const [data, count] = await Promise.all([
      this.model.aggregate([
        ...pipeline,
        { $skip: pagination.skip },
        { $limit: pagination.limit },
      ]),
      this.model.aggregate([...pipeline, { $count: 'total' }]),
    ]);
    const total = count[0]?.total ?? 0;
    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data,
    };
  }

  private buildInvoiceFilter(query: InvoiceListQueryDto): FilterQuery<InvoiceEntity> {
    const filter: FilterQuery<InvoiceEntity> = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.issuedFrom || query.issuedTo) {
      filter.createdAt = {
        ...(query.issuedFrom ? { $gte: new Date(query.issuedFrom) } : {}),
        ...(query.issuedTo
          ? { $lte: new Date(`${query.issuedTo}T23:59:59.999Z`) }
          : {}),
      };
    }
    if (query.keyword?.trim()) {
      const keyword = new RegExp(this.escapeRegex(query.keyword.trim()), 'i');
      filter.$or = [
        { invoiceNo: keyword },
        { workOrderNo: keyword },
        { 'billingParty.name': keyword },
        { 'vehicleSnapshot.licensePlate': keyword },
      ];
    }
    return filter;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
