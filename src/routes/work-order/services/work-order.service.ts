import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { AuthUser } from 'src/types/user.type';
import {
  CreateWorkOrderDto,
  getWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
} from '../dtos/work-order.dto';
import { EUserRole } from 'src/common/dto/roles.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Session } from 'inspector/promises';
import { ClientSession } from 'mongoose';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { EWorkOrderStatus } from '../enums/work-order.enum';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';

@Injectable()
export class WorkOrderService {
  constructor(
    @Inject(WorkOrderRepository)
    private readonly workOrderRepository: WorkOrderRepository,
    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
  ) {}

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

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async getWorkOrderByNo(workOrderNo: string) {
    try {
      const workOrder =
        await this.workOrderRepository.getByWorkOrderNo(workOrderNo);

      if (!workOrder) {
        throw new BusinessException('4040', 'Work order not found');
      }

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async updateWorkOrder(
    id: string,
    payload: UpdateWorkOrderDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    try {
      await this.getWorkOrderById(id);
      const workOrder = await this.workOrderRepository.updateWorkOrder(
        id,
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

  async updateStatus(id: string, status: EWorkOrderStatus, user: AuthUser) {
    try {
      if (status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException(
          '4001',
          'Completed work order cannot be updated',
        );
      }
      await this.getWorkOrderById(id);
      const workOrder = await this.workOrderRepository.updateStatus(
        id,
        status,
        user,
      );

      if (!workOrder) {
        throw new BusinessException(
          '5003',
          'Failed to update work order status',
        );
      }

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async deleteWorkOrder(id: string, user: AuthUser) {
    try {
      await this.getWorkOrderById(id);

      const workOrder = await this.workOrderRepository.softDelete(id, user);

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
    query: getWorkOrdersWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(query);

      const result = await this.workOrderRepository.findAllWithPaginated(
        { page, limit, skip },
        query,
        sortBy,
      );

      return result;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async assignQuotation(
    workOrderId: string,
    quotationId: string,
    user: AuthUser,
  ) {
    try {
      const workOrder = await this.getWorkOrderById(workOrderId);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }

      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException('4001', 'Work order already completed');
      }

      return this.workOrderRepository.updateCurrentQuotation(
        workOrderId,
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

      return workOrder;
    } catch (error) {
      throw error;
    }
  }

  async closeWorkOrder(workOrderId: string, user: AuthUser) {
    try {
      const workOrder = await this.getWorkOrderById(workOrderId);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }
      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException('4002', 'Work order already completed');
      }

      return this.workOrderRepository.updateStatus(
        workOrderId,
        EWorkOrderStatus.COMPLETED,
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  async cancelWorkOrder(workOrderId: string, user: AuthUser) {
    try {
      const workOrder = await this.getWorkOrderById(workOrderId);
      if (!workOrder) {
        throw new BusinessException('4040', 'not found');
      }
      if (workOrder.status === EWorkOrderStatus.COMPLETED) {
        throw new BusinessException(
          '4003',
          'Completed work order cannot be cancelled',
        );
      }

      return this.workOrderRepository.updateStatus(
        workOrderId,
        EWorkOrderStatus.CANCELLED,
        user,
      );
    } catch (error) {
      throw error;
    }
  }
}
