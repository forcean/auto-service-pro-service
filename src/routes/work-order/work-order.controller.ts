import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WorkOrderService } from './services/work-order.service';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import type { Request } from 'express';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { CreateWorkOrderDto } from './dtos/work-order.dto';

@Controller('work-order')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create-work-order')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create work order successful')
  async createWorkOrder(
    @Body() data: CreateWorkOrderDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.createWorkOrder(data, authUser);
  }
}
