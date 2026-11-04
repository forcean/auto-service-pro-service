import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { AuthUser } from 'src/types/user.type';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import {
  CreateWorkOrderDto,
  GetWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
} from 'src/routes/work-order/dtos/work-order.dto';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { IWorkOrderRecord } from 'src/routes/work-order/interfaces/work-order-record.interface';
import {
  WorkOrderTaskDocument,
  WorkOrderTaskEntity,
} from './work-order-task.schema';
import {
  getWorkOrderTasksWithPaginationDto,
  MyAssignmentsQueryDto,
  UpdateWorkOrderTaskDto,
} from 'src/routes/task/dtos/task.dto';
import { ETaskStatus, ETaskType } from 'src/routes/task/enums/task.enum';
import { EAdditionalProblemStatus } from 'src/routes/task/enums/task.enum';
import {
  ICreateTaskRequest,
  IUpdateTaskRequest,
} from 'src/routes/task/interfaces/task.interface';

@Injectable()
export class WorkOrderTaskRepository {
  constructor(
    @InjectModel(WorkOrderTaskEntity.name, 'autoservice')
    private readonly model: Model<WorkOrderTaskDocument>,
  ) {}

  async createTask(
    payload: ICreateTaskRequest,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [task] = await this.model.create(
      [
        {
          ...payload,
          createdBy: user.publicId,
        },
      ],
      {
        session,
      },
    );

    return task;
  }

  async getById(id: string) {
    return this.model
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .populate('workOrderId')
      .lean();
  }

  async getByTaskNo(taskNo: string) {
    return this.model.findOne({
      taskNo,

      isDeleted: false,
    });
  }

  async getByWorkOrderNo(workOrderNo: string) {
    return this.model
      .find({
        workOrderNo,
        isDeleted: false,
      })
      .select('status progress estimateMinute taskType isRequired parentTaskNo')
      .lean();
  }

  async exists(taskNo: string) {
    return this.model.exists({
      taskNo,

      isDeleted: false,
    });
  }

  async updateTask(
    taskNo: string,
    payload: IUpdateTaskRequest,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.model.findOneAndUpdate(
      {
        taskNo,
        isDeleted: false,
      },

      {
        ...payload,
        updatedBy: user.publicId,
      },
      {
        new: true,
        session,
      },
    );
  }

  async addProblem(taskNo: string, problem: any) {
    return this.model.findOneAndUpdate(
      {
        taskNo,
        isDeleted: false,
      },
      {
        $push: {
          additionalProblems: problem,
        },
      },
      {
        new: true,
      },
    );
  }

  async approveProblem(
    taskNo: string,
    problemId: string,
    user: AuthUser,
  ) {
    return this.model.findOneAndUpdate(
      {
        taskNo,
        isDeleted: false,
        'additionalProblems._id': new Types.ObjectId(problemId),
        'additionalProblems.status': EAdditionalProblemStatus.PENDING,
      },
      {
        $set: {
          'additionalProblems.$.status': EAdditionalProblemStatus.APPROVED,
          'additionalProblems.$.approvedBy': user.publicId,
          'additionalProblems.$.approvedAt': new Date(),
        },
      },
      { new: true },
    );
  }

  async rejectProblem(
    taskNo: string,
    problemId: string,
    reason: string,
    user: AuthUser,
  ) {
    return this.model.findOneAndUpdate(
      {
        taskNo,
        isDeleted: false,
        'additionalProblems._id': new Types.ObjectId(problemId),
        'additionalProblems.status': EAdditionalProblemStatus.PENDING,
      },
      {
        $set: {
          'additionalProblems.$.status': EAdditionalProblemStatus.REJECTED,
          'additionalProblems.$.rejectedBy': user.publicId,
          'additionalProblems.$.rejectedAt': new Date(),
          'additionalProblems.$.rejectedReason': reason,
        },
      },
      { new: true },
    );
  }

  async softDelete(taskNo: string, user: AuthUser) {
    return this.model.findOneAndUpdate(
      {
        taskNo,
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedBy: user.publicId,
      },
      {
        new: true,
      },
    );
  }

  async findMyAssignmentsPaginated(
    pagination: { page: number; limit: number; skip: number },
    query: MyAssignmentsQueryDto,
    userId: string,
  ) {
    // Older task records stored mechanicId as a string while the current
    // schema stores it as an ObjectId. Match both representations so an
    // existing assignment is never hidden from its mechanic.
    const mechanicIds = Types.ObjectId.isValid(userId)
      ? [userId, new Types.ObjectId(userId)]
      : [userId];
    const filter: FilterQuery<WorkOrderTaskEntity> = {
      isDeleted: false,
      taskType: { $ne: ETaskType.GROUP },
      'mechanics.mechanicId': { $in: mechanicIds },
      status: query.status
        ? query.status
        : { $nin: [ETaskStatus.FINISHED, ETaskStatus.CANCELLED] },
    };

    if (query.priority) filter.priority = query.priority;
    if (query.keyword?.trim()) {
      const keyword = new RegExp(this.escapeRegex(query.keyword.trim()), 'i');
      filter.$or = [
        { taskNo: keyword },
        { workOrderNo: keyword },
        { title: keyword },
        { description: keyword },
      ];
    }

    const { startOfToday, startOfTomorrow } = this.getBangkokDayBoundaries();
    switch (query.schedule) {
      case 'OVERDUE':
        filter.plannedFinishDate = { $lt: startOfToday };
        break;
      case 'TODAY':
        filter.plannedFinishDate = {
          $gte: startOfToday,
          $lt: startOfTomorrow,
        };
        break;
      case 'UPCOMING':
        filter.plannedFinishDate = { $gte: startOfTomorrow };
        break;
      case 'UNSCHEDULED':
        filter.plannedFinishDate = { $exists: false };
        break;
    }

    const basePipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'work_orders',
          localField: 'workOrderNo',
          foreignField: 'workOrderNo',
          as: 'workOrder',
        },
      },
      { $unwind: '$workOrder' },
      { $match: { 'workOrder.isDeleted': false } },
      {
        $addFields: {
          priorityRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'URGENT'] }, then: 0 },
                { case: { $eq: ['$priority', 'HIGH'] }, then: 1 },
                { case: { $eq: ['$priority', 'NORMAL'] }, then: 2 },
              ],
              default: 3,
            },
          },
          scheduleAt: { $ifNull: ['$plannedFinishDate', '$plannedStartDate'] },
          scheduleMissing: {
            $cond: [{ $ifNull: ['$plannedFinishDate', false] }, 0, 1],
          },
        },
      },
    ];
    const [result] = await this.model.aggregate<{
      data: any[];
      total: Array<{ count: number }>;
    }>([
      ...basePipeline,
      {
        $facet: {
          data: [
            { $sort: { priorityRank: 1, scheduleMissing: 1, scheduleAt: 1, createdAt: -1 } },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            {
              $lookup: {
                from: 'customersVehicle',
                localField: 'workOrder.vehicleId',
                foreignField: '_id',
                as: 'vehicle',
              },
            },
            { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                taskNo: 1,
                workOrderNo: 1,
                title: 1,
                description: 1,
                priority: 1,
                status: 1,
                taskType: 1,
                parentTaskNo: 1,
                isRequired: 1,
                blockedReason: 1,
                estimateMinute: 1,
                actualMinute: 1,
                progress: 1,
                isRework: 1,
                mechanics: 1,
                remark: 1,
                plannedStartDate: 1,
                plannedFinishDate: 1,
                startedAt: 1,
                finishedAt: 1,
                createdAt: 1,
                updatedAt: 1,
                workOrder: {
                  workOrderNo: '$workOrder.workOrderNo',
                  status: '$workOrder.status',
                  expectedFinishDate: '$workOrder.expectedFinishDate',
                  checkInDate: '$workOrder.checkInDate',
                  vehicle: {
                    licensePlate: '$vehicle.licensePlate',
                    province: '$vehicle.province',
                    firstname: '$vehicle.firstname',
                    lastname: '$vehicle.lastname',
                    billingName: '$vehicle.billingName',
                    phoneNumber: '$vehicle.phoneNumber',
                    brand: '$vehicle.vehicle.brand',
                    model: '$vehicle.vehicle.model',
                  },
                },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result?.total?.[0]?.count ?? 0;
    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      data: result?.data ?? [],
    };
  }

  async findAllWithPaginated(
    pagination: {
      page: number;
      limit: number;
      skip: number;
    },

    query: getWorkOrderTasksWithPaginationDto,

    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;
    const filter: FilterQuery<WorkOrderTaskEntity> = {};

    if (query.workOrderNo) {
      filter.workOrderNo = query.workOrderNo;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.taskNo) {
      filter.taskNo = query.taskNo;
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(
          sortBy ?? {
            createdAt: 'desc',
          },
        )
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
      data,
    };
  }

  private getBangkokDayBoundaries() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    const startOfToday = new Date(
      `${part('year')}-${part('month')}-${part('day')}T00:00:00.000+07:00`,
    );
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
    return { startOfToday, startOfTomorrow };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
