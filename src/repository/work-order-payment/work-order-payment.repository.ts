import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import { CreateWorkOrderPaymentDto } from 'src/routes/billing/dtos/billing.dto';
import {
  WorkOrderPaymentDocument,
  WorkOrderPaymentEntity,
} from './work-order-payment.schema';

@Injectable()
export class WorkOrderPaymentRepository {
  constructor(
    @InjectModel(WorkOrderPaymentEntity.name, 'autoservice')
    private readonly model: Model<WorkOrderPaymentDocument>,
  ) {}

  async create(
    payload: CreateWorkOrderPaymentDto & {
      paymentNo: string;
      workOrderId: string;
      workOrderNo: string;
    },
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [payment] = await this.model.create(
      [
        {
          ...payload,
          workOrderId: new Types.ObjectId(payload.workOrderId),
          receivedBy: user.publicId,
        },
      ],
      { session },
    );
    return payment;
  }

  findByWorkOrderNo(workOrderNo: string, session?: ClientSession) {
    return this.model
      .find({ workOrderNo, isDeleted: false })
      .sort({ paidAt: -1 })
      .session(session ?? null)
      .lean();
  }

  findAvailableByWorkOrderNo(workOrderNo: string, session?: ClientSession) {
    return this.model
      .find({
        workOrderNo,
        isDeleted: false,
        $expr: { $gt: ['$amount', '$allocatedAmount'] },
      })
      .sort({ paidAt: 1, _id: 1 })
      .session(session ?? null)
      .lean();
  }

  async allocateAmount(paymentId: string, amount: number, session?: ClientSession) {
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(paymentId),
          isDeleted: false,
          $expr: { $gte: [{ $subtract: ['$amount', '$allocatedAmount'] }, amount] },
        },
        { $inc: { allocatedAmount: amount } },
        { new: true, session },
      )
      .lean();
  }
}
