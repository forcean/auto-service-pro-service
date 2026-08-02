import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { AuthUser } from 'src/types/user.type';
import { WorkOrderEntity, WorkOrderDocument } from './work-order.schema';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import {
  CreateWorkOrderDto,
  getWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
} from 'src/routes/work-order/dtos/work-order.dto';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { IWorkOrderRecord } from 'src/routes/work-order/interfaces/work-order-record.interface';

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

  async getById(id: string): Promise<IWorkOrderRecord | null> {
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('vehicleId')
      .populate('customerId')
      .populate('advisorId')
      .lean<IWorkOrderRecord>();
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

  async updateWorkOrder(
    id: string,
    payload: UpdateWorkOrderDto,
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
    session?: ClientSession,
  ) {
    return this.model.findByIdAndUpdate(
      workOrderId,
      {
        currentQuotationId: quotationId,
        updatedBy: user.id,
      },
      {
        new: true,
        session,
      },
    );
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

  async findAllWithPaginated(
    pagination: { page: number; limit: number; skip: number },
    query: getWorkOrdersWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;

    const filter: FilterQuery<WorkOrderEntity> = {};

    // if (query.licensePlate) {
    //   filter.licensePlate = query.licensePlate;
    // }

    // if (query.province) {
    //   filter.province = query.province.toUpperCase();
    // }

    // if (query.status) {
    //   filter.status = query.status.toUpperCase();
    // }

    // if (query.model) {
    //   filter.model = query.model;
    // }

    // if (query.brand) {
    //   filter.brand = query.brand;
    // }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sortBy ?? { checkInDate: 'desc' })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}
