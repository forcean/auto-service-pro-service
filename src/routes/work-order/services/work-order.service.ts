import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { AuthUser } from 'src/types/user.type';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from '../dtos/work-order.dto';
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
    } catch (error) {}
  }

  async getWorkOrderById(id: string) {
    try {
      const workOrder = await this.workOrderRepository.getById(id);

      if (!workOrder) {
        throw new BusinessException('4040', 'Work order not found');
      }

      return workOrder;
    } catch (error) {}
  }

  async getWorkOrderByNo(workOrderNo: string) {
    try {
      const workOrder =
        await this.workOrderRepository.getByWorkOrderNo(workOrderNo);

      if (!workOrder) {
        throw new BusinessException('4040', 'Work order not found');
      }

      return workOrder;
    } catch (error) {}
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
    } catch (error) {}
  }

  async updateStatus(id: string, status: EWorkOrderStatus, user: AuthUser) {
    try {
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
    } catch (error) {}
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
    } catch (error) {}
  }

  async getVehiclesWithPagination(
    pagination: PaginationQuery,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(pagination);

      const result = await this.workOrderRepository.findAllWithPaginated(
        { page, limit, skip },
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
}
