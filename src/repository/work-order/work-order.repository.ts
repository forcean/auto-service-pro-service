import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { AuthUser } from 'src/types/user.type';
import { WorkOrderEntity, WorkOrderDocument } from './work-order.schema';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import { CreateWorkOrderDto } from 'src/routes/work-order/dtos/work-order.dto';

@Injectable()
export class WorkOrderRepository {
  constructor(
    @InjectModel(WorkOrderEntity.name, 'autoservice')
    private readonly model: Model<WorkOrderDocument>,
  ) {}

  async createWorkOrder(
    payload: CreateWorkOrderDto,
    workOrderNo: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [doc] = await this.model.create(
      [
        {
          ...payload,
          workOrderNo,
          createdBy: user.id,
        },
      ],
      { session },
    );

    return doc;
  }

  async getById(id: string) {
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('vehicleId')
      .populate('customerId')
      .populate('advisorId')
      .lean();
  }

  async getByWorkOrderNo(workOrderNo: string) {
    return this.model.findOne({
      workOrderNo,
      isDeleted: false,
    });
  }

  async exists(workOrderNo: string) {
    return this.model.exists({
      workOrderNo,
      isDeleted: false,
    });
  }

  async update(
    id: string,
    payload: Partial<WorkOrderEntity>,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model.findByIdAndUpdate(
      id,
      {
        ...payload,
        updatedBy: user.id,
      },
      {
        new: true,
        session,
      },
    );
  }

  async updateStatus(id: string, status: EWorkOrderStatus, user: AuthUser) {
    return this.model.findByIdAndUpdate(
      id,
      {
        status,
        updatedBy: user.id,
      },
      { new: true },
    );
  }

  async updateCurrentQuotation(
    workOrderId: string,
    quotationId: string,
    user: AuthUser,
  ) {
    return this.model.findByIdAndUpdate(
      workOrderId,
      {
        currentQuotationId: quotationId,
        updatedBy: user.id,
      },
      {
        new: true,
      },
    );
  }

  async find(filter: FilterQuery<WorkOrderEntity>) {
    return this.model.find({
      ...filter,
      isDeleted: false,
    });
  }

  async softDelete(id: string, user: AuthUser) {
    return this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        updatedBy: user.id,
      },
      {
        new: true,
      },
    );
  }

  async getLastWorkOrder(prefix: string) {
    return this.model
      .findOne({
        workOrderNo: {
          $regex: `^${prefix}`,
        },
      })
      .sort({
        workOrderNo: -1,
      })
      .lean();
  }
}
