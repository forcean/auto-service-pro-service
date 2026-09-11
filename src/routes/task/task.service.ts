import { Inject, Injectable } from '@nestjs/common';
import { AuthUser } from 'src/types/user.type';
import { WorkOrderService } from '../work-order/services/work-order.service';
import {
  CreateWorkOrderTaskDto,
  ApproveAdditionalProblemDto,
  getWorkOrderTasksWithPaginationDto,
  ReportAdditionalProblemDto,
  UpdateWorkOrderTaskDto,
} from './dtos/task.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WorkOrderTaskRepository } from 'src/repository/work-order-task/work-order-task.repository';
import { QuotationRepository } from 'src/repository/quotation/quotation.repository';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';
import { ETaskStatus } from './enums/task.enum';
import { EAdditionalProblemStatus } from './enums/task.enum';
import { EQuotationStatus } from '../quotation/enums/quotation.enum';
import { EWorkOrderStatus } from '../work-order/enums/work-order.enum';

@Injectable()
export class TaskService {
  constructor(
    @Inject(WorkOrderTaskRepository)
    private readonly taskRepository: WorkOrderTaskRepository,
    @Inject(QuotationRepository)
    private readonly quotationRepository: QuotationRepository,
    @Inject(WorkOrderService)
    private readonly workOrderService: WorkOrderService,
    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
  ) {}

  async createTask(payload: CreateWorkOrderTaskDto, user: AuthUser) {
    try {
      const workOrder = await this.workOrderService.getWorkOrderByNo(
        payload.workOrderNo,
      );

      if (!workOrder) {
        throw new BusinessException('4040', 'Work Order not found');
      }

      const taskNo = await this.documentNoService.generateTaskNo(
        payload.workOrderNo,
      );

      let isRework = false;

      if (payload.isRework !== undefined) {
        isRework = payload.isRework;
      }

      const task = await this.taskRepository.createTask(
        {
          workOrderNo: workOrder.workOrderNo,
          taskNo,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          status: payload.status ?? ETaskStatus.WAITING,
          estimateMinute: payload.estimateMinute,
          actualMinute: payload.actualMinute,
          plannedStartDate: payload.plannedStartDate
            ? new Date(payload.plannedStartDate)
            : undefined,

          plannedFinishDate: payload.plannedFinishDate
            ? new Date(payload.plannedFinishDate)
            : undefined,
          mechanics:
            payload.mechanics?.map((item) => ({
              mechanicId: item.mechanicId,
              mechanicName: item.mechanicName,
            })) ?? [],
          remark: payload.remark,
          isRework,
        },
        user,
      );

      if (!task) {
        throw new BusinessException('5001', 'Failed to create task');
      }

      await this.workOrderService.updateStatus(
        payload.workOrderNo,
        EWorkOrderStatus.IN_PROGRESS,
        user,
      );
      return task;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(
    taskNo: string,
    payload: UpdateWorkOrderTaskDto,
    user: AuthUser,
  ) {
    try {
      const task = await this.getTaskByNo(taskNo);

      if (task.status === ETaskStatus.FINISHED) {
        throw new BusinessException('4001', 'Completed task cannot update');
      }

      if (task.status === ETaskStatus.CANCELLED) {
        throw new BusinessException('4001', 'Cancelled task cannot update');
      }

      const result = await this.taskRepository.updateTask(
        taskNo,
        {
          ...payload,
          plannedStartDate: payload.plannedStartDate
            ? new Date(payload.plannedStartDate)
            : undefined,

          plannedFinishDate: payload.plannedFinishDate
            ? new Date(payload.plannedFinishDate)
            : undefined,
        },
        user,
      );

      if (!result) {
        throw new BusinessException('5002', 'Failed to update task');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(taskNo: string, user: AuthUser) {
    try {
      const task = await this.getTaskByNo(taskNo);

      if (task.status === ETaskStatus.IN_PROGRESS) {
        throw new BusinessException('4002', 'Cannot delete running task');
      }

      const result = await this.taskRepository.softDelete(taskNo, user);

      if (!result) {
        throw new BusinessException('5004', 'Failed to delete task');
      }

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async getTaskByNo(taskNo: string) {
    try {
      const task = await this.taskRepository.getByTaskNo(taskNo);

      if (!task) {
        throw new BusinessException('4040', 'Task not found');
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  async getTasksByWorkOrderNo(workOrderNo: string) {
    return this.taskRepository.getByWorkOrderNo(workOrderNo);
  }

  async getTasksWithPagination(
    query: getWorkOrderTasksWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(query);

      const result = await this.taskRepository.findAllWithPaginated(
        {
          page,
          limit,
          skip,
        },
        query,
        sortBy,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(taskNo: string, status: ETaskStatus, user: AuthUser) {
    try {
      const task = await this.getTaskByNo(taskNo);

      this.validateStatus(task.status, status);

      if (status === ETaskStatus.FINISHED) {
        return this.finishTask(taskNo, user);
      }

      const metaData = this.syncStatusMetaData(status);
      const result = await this.taskRepository.updateTask(
        taskNo,
        {
          status,
          ...metaData,
        },
        user,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to update task status');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async reportAdditionalProblem(
    taskNo: string,
    problem: ReportAdditionalProblemDto,
    user: AuthUser,
  ) {
    try {
      const task = await this.getTaskByNo(taskNo);

      if (task.status === ETaskStatus.FINISHED) {
        throw new BusinessException('4001', 'Completed task cannot report problem');
      }

      const result = await this.taskRepository.addProblem(taskNo, {
        description: problem.description,
        createdBy: user.publicId,
      });

      await this.workOrderService.updateStatus(
        task.workOrderNo,
        EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL,
        user,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async approveAdditionalProblem(
    taskNo: string,
    problemId: string,
    payload: ApproveAdditionalProblemDto,
    user: AuthUser,
  ) {
    const task = await this.getTaskByNo(taskNo);
    const quotation = await this.quotationRepository.getQuotationById(
      payload.quotationId,
    );

    if (!quotation) {
      throw new BusinessException('4040', 'Quotation not found');
    }

    if (quotation.status !== EQuotationStatus.APPROVED) {
      throw new BusinessException(
        '4006',
        'Additional repair quotation must be approved first',
      );
    }

    const workOrder = await this.workOrderService.getWorkOrderByNo(
      task.workOrderNo,
    );
    const quotationWorkOrder = quotation.workOrderId as any;
    let quotationWorkOrderId: string;

    if (quotationWorkOrder._id) {
      quotationWorkOrderId = quotationWorkOrder._id.toString();
    } else {
      quotationWorkOrderId = quotationWorkOrder.toString();
    }

    if (quotationWorkOrderId !== workOrder._id.toString()) {
      throw new BusinessException(
        '4007',
        'Quotation does not belong to this Work Order',
      );
    }

    const problem = task.additionalProblems?.find((item: any) => {
      return item._id.toString() === problemId;
    });

    if (!problem) {
      throw new BusinessException('4042', 'Additional problem not found');
    }

    if (problem.status !== EAdditionalProblemStatus.PENDING) {
      throw new BusinessException('4005', 'Additional problem already reviewed');
    }

    const approvedTask = await this.taskRepository.approveProblem(
      taskNo,
      problemId,
      user,
    );

    if (!approvedTask) {
      throw new BusinessException('5006', 'Failed to approve additional problem');
    }

    const taskNoForRework = await this.documentNoService.generateTaskNo(
      task.workOrderNo,
    );
    const reworkTask = await this.taskRepository.createTask(
      {
        workOrderNo: task.workOrderNo,
        taskNo: taskNoForRework,
        title: payload.title || `แก้ไขปัญหาเพิ่มเติม: ${problem.description}`,
        description: problem.description,
        estimateMinute: payload.estimateMinute,
        status: ETaskStatus.WAITING,
        mechanics: [],
        remark: 'Created from approved additional problem',
        isRework: true,
      },
      user,
    );

    await this.workOrderService.updateStatus(
      task.workOrderNo,
      EWorkOrderStatus.IN_PROGRESS,
      user,
    );

    return reworkTask;
  }

  private validateStatus(current: ETaskStatus, next: ETaskStatus) {
    const statusFlow: Record<ETaskStatus, ETaskStatus[]> = {
      [ETaskStatus.WAITING]: [ETaskStatus.ASSIGNED, ETaskStatus.CANCELLED],
      [ETaskStatus.ASSIGNED]: [ETaskStatus.IN_PROGRESS, ETaskStatus.CANCELLED],
      [ETaskStatus.IN_PROGRESS]: [
        ETaskStatus.PAUSED,
        ETaskStatus.FINISHED,
        ETaskStatus.CANCELLED,
        ETaskStatus.QUALITY_CHECK,
      ],
      [ETaskStatus.QUALITY_CHECK]: [
        ETaskStatus.FINISHED,
        ETaskStatus.IN_PROGRESS,
      ],
      [ETaskStatus.PAUSED]: [ETaskStatus.IN_PROGRESS, ETaskStatus.CANCELLED],
      [ETaskStatus.FINISHED]: [],
      [ETaskStatus.CANCELLED]: [],
    };

    const allowedStatuses = statusFlow[current] ?? [];

    if (!allowedStatuses.includes(next)) {
      throw new BusinessException(
        '4004',
        `Cannot change task status from ${current} to ${next}`,
      );
    }
  }

  private async finishTask(taskNo: string, user: AuthUser) {
    const task = await this.getTaskByNo(taskNo);
    const result = await this.taskRepository.updateTask(
      taskNo,
      { status: ETaskStatus.FINISHED, progress: 100, finishedAt: new Date() },
      user,
    );
    if (!result) {
      throw new BusinessException('5003', 'Failed to update task status');
    }

    await this.checkAllTasksFinished(task.workOrderNo, user);
    return result;
  }

  private async checkAllTasksFinished(workOrderNo: string, user: AuthUser) {
    const tasks = await this.taskRepository.getByWorkOrderNo(workOrderNo);

    if (!tasks.length) {
      return;
    }
    const allFinished = tasks.every(
      (task) => task.status === ETaskStatus.FINISHED,
    );

    if (!allFinished) {
      return;
    }

    await this.workOrderService.updateStatus(
      workOrderNo,
      EWorkOrderStatus.WAITING_QC,
      user,
    );
  }

  private syncStatusMetaData(status: ETaskStatus) {
    const now = new Date();

    switch (status) {
      case ETaskStatus.ASSIGNED:
        return {
          assignedAt: now,
        };

      case ETaskStatus.IN_PROGRESS:
        return {
          startedAt: now,
        };

      case ETaskStatus.PAUSED:
        return {
          pausedAt: now,
        };

      case ETaskStatus.QUALITY_CHECK:
        return {};

      default:
        return {};
    }
  }
}
