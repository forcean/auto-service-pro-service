import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { EUserRole } from 'src/common/dto/roles.enum';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WarrantyClaimRepository } from 'src/repository/warranty-claim/warranty-claim.repository';
import { WarrantyClaimStatus } from 'src/repository/warranty-claim/warranty-claim.schema';
import { AuthUser } from 'src/types/user.type';
import { WorkOrderService } from 'src/routes/work-order/services/work-order.service';
import {
  ApproveWarrantyClaimDto,
  CreateWarrantyClaimDto,
  RejectWarrantyClaimDto,
} from './dtos/warranty-claim.dto';

@Injectable()
export class WarrantyClaimService {
  constructor(
    @Inject(WarrantyClaimRepository)
    private readonly warrantyClaimRepository: WarrantyClaimRepository,
    @Inject(WorkOrderService)
    private readonly workOrderService: WorkOrderService,
    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
  ) {}

  async create(dto: CreateWarrantyClaimDto, user: AuthUser) {
    const original = await this.workOrderService.getWorkOrderByNo(dto.workOrderNo.trim());
    const warrantyDays = dto.warrantyDays ?? 90;
    const warrantyExpiresAt = new Date(new Date(original.checkInDate).getTime() + warrantyDays * 24 * 60 * 60 * 1000);
    const claimNo = await this.documentNoService.generate(EDocumentType.WARRANTY_CLAIM);
    return this.warrantyClaimRepository.create({
      claimNo,
      originalWorkOrderId: original._id,
      originalWorkOrderNo: original.workOrderNo,
      vehicleId: original.vehicleId,
      description: dto.description.trim(),
      warrantyDays,
      warrantyExpiresAt,
      isWithinWarranty: warrantyExpiresAt.getTime() >= Date.now(),
    }, user);
  }

  findAll(status?: WarrantyClaimStatus) {
    return this.warrantyClaimRepository.findAll(status);
  }

  async approve(id: string, dto: ApproveWarrantyClaimDto, user: AuthUser) {
    this.ensureManager(user);
    const claim = await this.getOpenClaim(id);
    const workOrder = await this.workOrderService.createWorkOrder({
      vehicleId: String(claim.vehicleId),
      mileage: dto.mileage,
      complaints: [{
        title: `งานรับประกันจาก ${claim.originalWorkOrderNo}`,
        description: claim.description,
      }],
      inspectionRequired: false,
      internalRemark: `Warranty claim ${claim.claimNo}`,
    }, user);
    const updated = await this.warrantyClaimRepository.approve(
      id,
      workOrder.workOrderNo,
      String(workOrder._id),
      user,
    );
    if (!updated) throw new BusinessException('4090', 'Warranty claim status changed. Please refresh and try again');
    return updated;
  }

  async reject(id: string, dto: RejectWarrantyClaimDto, user: AuthUser) {
    this.ensureManager(user);
    await this.getOpenClaim(id);
    const updated = await this.warrantyClaimRepository.reject(id, dto.reason.trim(), user);
    if (!updated) throw new BusinessException('4090', 'Warranty claim status changed. Please refresh and try again');
    return updated;
  }

  async close(id: string, user: AuthUser) {
    this.ensureManager(user);
    if (!Types.ObjectId.isValid(id)) throw new BusinessException('4040', 'Warranty claim not found');
    const updated = await this.warrantyClaimRepository.close(id, user);
    if (!updated) throw new BusinessException('4001', 'Only approved warranty claims can be closed');
    return updated;
  }

  private async getOpenClaim(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BusinessException('4040', 'Warranty claim not found');
    const claim = await this.warrantyClaimRepository.findById(id);
    if (!claim) throw new BusinessException('4040', 'Warranty claim not found');
    if (claim.status !== 'OPEN') throw new BusinessException('4001', 'Only open warranty claims can be reviewed');
    return claim;
  }

  private ensureManager(user: AuthUser) {
    if (![EUserRole.SystemOwner, EUserRole.Admin, EUserRole.Manager].includes(user.role as EUserRole)) {
      throw new BusinessException('4030', 'Manager access is required');
    }
  }
}
