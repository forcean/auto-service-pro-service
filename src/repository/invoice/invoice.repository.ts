import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  CreatePaymentDto,
  CreateRefundDto,
} from 'src/routes/billing/dtos/billing.dto';
import { EInvoiceStatus } from 'src/routes/billing/enums/billing.enum';
import { InvoiceDocument, InvoiceEntity } from './invoice.schema';

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

  async findAll() {
    return this.model.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
  }

  async voidInvoice(id: string, user: AuthUser) {
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
}
