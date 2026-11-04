import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ApproveWarrantyClaimDto,
  CreateWarrantyClaimDto,
  RejectWarrantyClaimDto,
  WarrantyClaimQueryDto,
} from './dtos/warranty-claim.dto';
import { WarrantyClaimService } from './warranty-claim.service';

@Controller('warranty-claims')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class WarrantyClaimController {
  constructor(private readonly warrantyClaimService: WarrantyClaimService) {}

  @Get()
  @ResponseResultCode('2000')
  @ResponseMessage('Get warranty claims successful')
  getClaims(@Query() query: WarrantyClaimQueryDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.warrantyClaimService.findAll(query.status);
  }

  @Post()
  @ResponseResultCode('2001')
  @ResponseMessage('Create warranty claim successful')
  create(@Body() dto: CreateWarrantyClaimDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.warrantyClaimService.create(dto, authUser!);
  }

  @Post(':claimId/approve')
  @ResponseResultCode('2000')
  @ResponseMessage('Approve warranty claim successful')
  approve(@Param('claimId') claimId: string, @Body() dto: ApproveWarrantyClaimDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.warrantyClaimService.approve(claimId, dto, authUser!);
  }

  @Post(':claimId/reject')
  @ResponseResultCode('2000')
  @ResponseMessage('Reject warranty claim successful')
  reject(@Param('claimId') claimId: string, @Body() dto: RejectWarrantyClaimDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.warrantyClaimService.reject(claimId, dto, authUser!);
  }

  @Post(':claimId/close')
  @ResponseResultCode('2000')
  @ResponseMessage('Close warranty claim successful')
  close(@Param('claimId') claimId: string, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.warrantyClaimService.close(claimId, authUser!);
  }

  private ensureAuthenticated(authUser: Request['authUser']): asserts authUser {
    if (!authUser) throw new BusinessException('4013', 'No auth user found');
  }
}
