import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { AuthUser } from 'src/types/user.type';
import { CreateWorkOrderDto } from '../dtos/work-order.dto';
import { EUserRole } from 'src/common/dto/roles.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Session } from 'inspector/promises';
import { ClientSession } from 'mongoose';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { EDocumentType } from 'src/common/enums/document-type.enum';

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
}
