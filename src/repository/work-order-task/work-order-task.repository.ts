import { Injectable } from '@nestjs/common';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { AuthUser } from 'src/types/user.type';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import {
  CreateWorkOrderDto,
  getWorkOrdersWithPaginationDto,
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
  UpdateWorkOrderTaskDto,
} from 'src/routes/task/dtos/task.dto';
import { ETaskStatus } from 'src/routes/task/enums/task.enum';
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
    return this.model.find({
      workOrderNo,
      isDeleted: false,
    });
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
}
