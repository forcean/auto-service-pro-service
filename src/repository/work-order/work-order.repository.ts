import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { AuthUser } from 'src/types/user.type';
import { WorkOrderEntity, WorkOrderDocument } from './work-order.schema';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import {
  CreateWorkOrderDto,
  GetWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
} from 'src/routes/work-order/dtos/work-order.dto';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { IWorkOrderRecord } from 'src/routes/work-order/interfaces/work-order-record.interface';
import { CustomersVehicleEntity } from '../customers-vehicle/customers-vehicle.schema';

@Injectable()
export class WorkOrderRepository {
  constructor(
    @InjectModel(WorkOrderEntity.name, 'autoservice')
    private readonly model: Model<WorkOrderDocument>,
    @InjectModel(CustomersVehicleEntity.name, 'autoservice')
    private readonly customersVehicleModel: Model<any>,
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
          vehicleId: new Types.ObjectId(payload.vehicleId),
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
      .populate('advisorId')
      .lean<IWorkOrderRecord>();
  }

  async getByWorkOrderNo(workOrderNo: string) {
    return (
      this.model
        .findOne({
          workOrderNo,
          isDeleted: false,
        })
        .populate({
          path: 'vehicleId',
        })
        .lean()
    );
  }

  async exists(workOrderNo: string) {
    return this.model.exists({
      workOrderNo,
      isDeleted: false,
    });
  }

  async updateWorkOrder(
    workOrderNo: string,
    payload: UpdateWorkOrderDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model.findOneAndUpdate(
      {
        workOrderNo,
        isDeleted: false,
      },
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

  async updateStatus(
    id: string,
    status: EWorkOrderStatus,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model.findByIdAndUpdate(
      id,
      {
        status,
        updatedBy: user.id,
      },
      { new: true, session },
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
        currentQuotationId: new Types.ObjectId(quotationId),
        updatedBy: user.publicId,
      },
      {
        new: true,
        session,
      },
    );
  }

  async updateInvoice(
    workOrderId: string,
    invoiceId: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model.findByIdAndUpdate(
      workOrderId,
      { invoiceId: new Types.ObjectId(invoiceId), updatedBy: user.id },
      { new: true, session },
    );
  }

  async softDelete(id: string, user: AuthUser) {
    return this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        updatedBy: user.publicId,
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
    query: GetWorkOrdersWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;

    const filter: FilterQuery<WorkOrderEntity> = {
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      // The date picker represents a calendar day in the application's
      // Thailand timezone, not a single instant in UTC.
      const startOfDay = new Date(`${query.date}T00:00:00.000+07:00`);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

      filter.checkInDate = {
        $gte: startOfDay,
        $lt: startOfNextDay,
      };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      const searchRegex = new RegExp(search, 'i');
      const matchingVehicles = await this.customersVehicleModel
        .find({
          $or: [
            { licensePlate: searchRegex },
            { province: searchRegex },
            { firstname: searchRegex },
            { lastname: searchRegex },
            { billingName: searchRegex },
            { phoneNumber: searchRegex },
          ],
        })
        .select('_id')
        .lean();

      filter.$or = [
        { workOrderNo: searchRegex },
        { vehicleId: { $in: matchingVehicles.map((vehicle) => vehicle._id) } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate({
          path: 'vehicleId',
          select:
            '_id licensePlate province vin vehicle firstname lastname phoneNumber billingName taxId billingAddress branchNo',
        })
        .sort(sortBy ?? { checkInDate: 'desc' })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: data.map(({ vehicleId, ...item }) => ({
        ...item,
        vehicle: vehicleId,
      })),
    };
  }

  async findBillingCandidates() {
    return this.model
      .find({
        isDeleted: false,
        status: {
          $in: [
            EWorkOrderStatus.COMPLETED,
            EWorkOrderStatus.READY_DELIVERY,
          ],
        },
      })
      .populate({ path: 'vehicleId' })
      .lean();
  }
}
