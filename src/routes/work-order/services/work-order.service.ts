import { Inject, Injectable } from '@nestjs/common';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { AuthUser } from 'src/types/user.type';
import {
  CreateWorkOrderDto,
  GetWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
} from '../dtos/work-order.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ClientSession } from 'mongoose';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { EWorkOrderStatus } from '../enums/work-order.enum';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';
import { WorkOrderTaskRepository } from 'src/repository/work-order-task/work-order-task.repository';
import { InvoiceRepository } from 'src/repository/invoice/invoice.repository';
import { calculateWorkOrderProgress } from '../utils/work-order-progress.util';
import { CustomersVehicleRepository } from 'src/repository/customers-vehicle/customers-vehicle.repository';
import { EVehicleStatus } from 'src/routes/vehicles-management/enums/customers-vehicle.enum';

@Injectable()
export class WorkOrderService {
  constructor(
    @Inject(WorkOrderRepository)
    private readonly workOrderRepository: WorkOrderRepository,
    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
    @Inject(WorkOrderTaskRepository)
    private readonly taskRepository: WorkOrderTaskRepository,
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(CustomersVehicleRepository)
    private readonly customersVehicleRepository: CustomersVehicleRepository,
  ) {}

  // insert new work order
  async createWorkOrder(
    payload: CreateWorkOrderDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    try {
      const workOrderNo = await this.documentNoService.generate(
        EDocumentType.WORK_ORDER,
      );

      const workOrder = await this.workOrderRepository.createWorkOrder(
        payload,
        workOrderNo,
        user,
        session,
      );

      if (!workOrder) {
        throw new BusinessException('5001', 'Failed to create work order');
      }

      await this.syncVehicleStatus(
        workOrder.vehicleId.toString(),
        EWorkOrderStatus.OPEN,
        user,
        session,
      );

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async getWorkOrderById(id: string) {
    try {
      const workOrder = await this.workOrderRepository.getById(id);

      if (!workOrder) {
        throw new BusinessException('4040', 'Work order not found');
      }

      return this.withProgress(workOrder);
    } catch (error) {
      throw error;
    }
  }

  // call work order with work order number
  async getWorkOrderByNo(workOrderNo: string) {
    try {
      const workOrder =
        await this.workOrderRepository.getByWorkOrderNo(workOrderNo);

      if (!workOrder) {
        throw new BusinessException('4040', 'Work order not found');
      }

      return this.withProgress(workOrder);
    } catch (error) {
      throw error;
    }
  }

  //  update data for work order
  async updateWorkOrder(
    workOrderNo: string,
    payload: UpdateWorkOrderDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    try {
      await this.getWorkOrderByNo(workOrderNo);
      const workOrder = await this.workOrderRepository.updateWorkOrder(
        workOrderNo,
        payload,
        user,
        session,
      );

      if (!workOrder) {
        throw new BusinessException('5002', 'Failed to update work order');
      }

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(
    workOrderNo: string,
    status: EWorkOrderStatus,
    user: AuthUser,
  ) {
    try {
      if (status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException(
          '4001',
          'Completed work order cannot be updated',
        );
      }
      const foundWorkOrder = await this.getWorkOrderByNo(workOrderNo);
      this.validateStatusTransition(foundWorkOrder.status, status);
      const workOrder = await this.workOrderRepository.updateStatus(
        foundWorkOrder._id.toString(),
        status,
        user,
      );

      if (!workOrder) {
        throw new BusinessException(
          '5003',
          'Failed to update work order status',
        );
      }

      await this.syncVehicleStatus(
        this.getVehicleId(foundWorkOrder.vehicleId),
        status,
        user,
      );

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async deleteWorkOrder(workOrderNo: string, user: AuthUser) {
    try {
      await this.getWorkOrderByNo(workOrderNo);
      const workOrder = await this.workOrderRepository.softDelete(
        workOrderNo,
        user,
      );

      if (!workOrder) {
        throw new BusinessException('5004', 'Failed to delete work order');
      }

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async getWorkOrdersWithPagination(
    query: GetWorkOrdersWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(query);

      const result = await this.workOrderRepository.findAllWithPaginated(
        { page, limit, skip },
        query,
        sortBy,
      );

      const data = await Promise.all(
        result.data.map((workOrder) => this.withProgress(workOrder)),
      );
      return { ...result, data };
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async withProgress<T extends { workOrderNo: string }>(workOrder: T) {
    const tasks = await this.taskRepository.getByWorkOrderNo(
      workOrder.workOrderNo,
    );
    const taskProgress = calculateWorkOrderProgress(tasks);

    return {
      ...workOrder,
      progress: taskProgress.progress,
      taskSummary: {
        totalTasks: taskProgress.totalTasks,
        completedTasks: taskProgress.completedTasks,
        cancelledTasks: taskProgress.cancelledTasks,
      },
    };
  }

  private validateStatusTransition(
    currentStatus: EWorkOrderStatus,
    nextStatus: EWorkOrderStatus,
  ) {
    const allowedTransitions: Record<
      EWorkOrderStatus,
      EWorkOrderStatus[]
    > = {
      [EWorkOrderStatus.OPEN]: [
        EWorkOrderStatus.INSPECTING,
        EWorkOrderStatus.WAITING_QUOTATION,
        EWorkOrderStatus.WAITING_APPROVAL,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.INSPECTING]: [
        EWorkOrderStatus.WAITING_QUOTATION,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.WAITING_QUOTATION]: [
        EWorkOrderStatus.WAITING_APPROVAL,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.WAITING_APPROVAL]: [
        EWorkOrderStatus.WAITING_ASSIGNMENT,
        EWorkOrderStatus.IN_PROGRESS,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.WAITING_ASSIGNMENT]: [
        EWorkOrderStatus.IN_PROGRESS,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.IN_PROGRESS]: [
        EWorkOrderStatus.WAITING_QC,
        EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL,
        EWorkOrderStatus.HOLD,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL]: [
        EWorkOrderStatus.IN_PROGRESS,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.WAITING_QC]: [
        EWorkOrderStatus.QC_APPROVED,
        EWorkOrderStatus.REWORK,
        EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL,
      ],
      [EWorkOrderStatus.REWORK]: [
        EWorkOrderStatus.IN_PROGRESS,
        EWorkOrderStatus.CANCELLED,
      ],
      [EWorkOrderStatus.QC_APPROVED]: [
        EWorkOrderStatus.READY_DELIVERY,
      ],
      [EWorkOrderStatus.READY_DELIVERY]: [],
      [EWorkOrderStatus.COMPLETED]: [],
      [EWorkOrderStatus.CANCELLED]: [],
      [EWorkOrderStatus.HOLD]: [
        EWorkOrderStatus.IN_PROGRESS,
        EWorkOrderStatus.CANCELLED,
      ],
    };

    const allowedStatuses = allowedTransitions[currentStatus];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new BusinessException(
        '4004',
        `Cannot change work order status from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  async assignQuotation(
    workOrderNo: string,
    quotationId: string,
    user: AuthUser,
  ) {
    try {
      const workOrder = await this.getWorkOrderByNo(workOrderNo);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }

      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException('4001', 'Work order already completed');
      }

      return this.workOrderRepository.updateCurrentQuotation(
        workOrder._id.toString(),
        quotationId,
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  async updateCurrentQuotation(
    workOrderId: string,
    quotationId: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    try {
      await this.getWorkOrderById(workOrderId);

      const workOrder = await this.workOrderRepository.updateCurrentQuotation(
        workOrderId,
        quotationId,
        user,
        session,
      );

      if (!workOrder) {
        throw new BusinessException(
          '5005',
          'Failed to update current quotation',
        );
      }

      await this.syncVehicleStatus(
        this.getVehicleId(workOrder.vehicleId),
        EWorkOrderStatus.WAITING_APPROVAL,
        user,
        session,
      );

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async updateInvoice(
    workOrderId: string,
    invoiceId: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    try {
      const workOrder = await this.workOrderRepository.updateInvoice(
        workOrderId,
        invoiceId,
        user,
        session,
      );

      if (!workOrder) {
        throw new BusinessException('5006', 'Failed to update work order invoice');
      }

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async closeWorkOrder(workOrderNo: string, user: AuthUser, session?: ClientSession) {
    try {
      ``;
      const workOrder = await this.getWorkOrderByNo(workOrderNo);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }
      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException('4002', 'Work order already completed');
      }

      if (workOrder.status !== EWorkOrderStatus.READY_DELIVERY) {
        throw new BusinessException(
          '4008',
          'Work order must be ready for delivery before closing',
        );
      }

      const invoice = await this.invoiceRepository.findByWorkOrderId(
        workOrder._id.toString(),
        session,
      );

      if (!invoice || invoice.status !== 'PAID') {
        throw new BusinessException(
          '4009',
          'Paid invoice is required before closing work order',
        );
      }

      const result = await this.workOrderRepository.updateStatus(
        workOrder._id.toString(),
        EWorkOrderStatus.COMPLETED,
        user,
        session,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to close work order');
      }

      await this.syncVehicleStatus(
        this.getVehicleId(workOrder.vehicleId),
        EWorkOrderStatus.COMPLETED,
        user,
        session,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async cancelWorkOrder(workOrderNo: string, user: AuthUser) {
    try {
      const workOrder = await this.getWorkOrderByNo(workOrderNo);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }
      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException(
          '4003',
          'Completed work order cannot be cancelled',
        );
      }

      const result = await this.workOrderRepository.updateStatus(
        workOrder._id.toString(),
        EWorkOrderStatus.CANCELLED,
        user,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to cancel work order');
      }

      await this.syncVehicleStatus(
        this.getVehicleId(workOrder.vehicleId),
        EWorkOrderStatus.CANCELLED,
        user,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  private async syncVehicleStatus(
    vehicleId: string,
    workOrderStatus: EWorkOrderStatus,
    user: AuthUser,
    session?: ClientSession,
  ): Promise<void> {
    const vehicleStatus = this.getVehicleStatus(workOrderStatus);
    const updatedVehicle = await this.customersVehicleRepository.updateStatusById(
      vehicleId,
      vehicleStatus,
      user.publicId,
      session,
    );

    if (!updatedVehicle) {
      throw new BusinessException('5007', 'Failed to synchronize vehicle status');
    }
  }

  private getVehicleStatus(workOrderStatus: EWorkOrderStatus): EVehicleStatus {
    switch (workOrderStatus) {
      case EWorkOrderStatus.OPEN:
      case EWorkOrderStatus.INSPECTING:
        return EVehicleStatus.INSPECTING;
      case EWorkOrderStatus.WAITING_QUOTATION:
      case EWorkOrderStatus.WAITING_APPROVAL:
      case EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL:
        return EVehicleStatus.WAITING_APPROVAL;
      case EWorkOrderStatus.WAITING_ASSIGNMENT:
      case EWorkOrderStatus.HOLD:
        return EVehicleStatus.PENDING;
      case EWorkOrderStatus.IN_PROGRESS:
      case EWorkOrderStatus.REWORK:
        return EVehicleStatus.REPAIRING;
      case EWorkOrderStatus.WAITING_QC:
        return EVehicleStatus.QUALITY_CHECK;
      case EWorkOrderStatus.QC_APPROVED:
      case EWorkOrderStatus.READY_DELIVERY:
        return EVehicleStatus.READY_FOR_PICKUP;
      case EWorkOrderStatus.COMPLETED:
        return EVehicleStatus.COMPLETED;
      case EWorkOrderStatus.CANCELLED:
        return EVehicleStatus.CANCELLED;
      default:
        return EVehicleStatus.PENDING;
    }
  }

  private getVehicleId(vehicle: unknown): string {
    if (typeof vehicle === 'string') {
      return vehicle;
    }

    if (vehicle && typeof vehicle === 'object' && '_id' in vehicle) {
      return String((vehicle as { _id: unknown })._id);
    }

    return String(vehicle);
  }
}
