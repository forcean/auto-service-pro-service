import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import {
  CreateWorkOrderDto,
  GetWorkOrdersWithPaginationDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from './dtos/work-order.dto';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Controller('work-order')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:work-order')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2001')
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

  @Patch('/:workOrderNo/')
  @UseGuards(PermissionsGuard)
  @Permissions('update:work-order')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update work order successful')
  async updateWorkOrder(
    @Body() data: UpdateWorkOrderDto,
    @Req() { authUser }: Request,
    @Param('workOrderNo') workOrderNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.updateWorkOrder(workOrderNo, data, authUser);
  }

  @Patch('/:workOrderNo/status')
  @UseGuards(PermissionsGuard)
  @Permissions('update:work-order')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update status work order successful')
  async updateWorkOrderStatus(
    @Body() dto: UpdateWorkOrderStatusDto,
    @Req() { authUser }: Request,
    @Param('workOrderNo') workOrderNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.updateStatus(
      workOrderNo,
      dto.status,
      authUser,
    );
  }

  @Post('/:workOrderNo/delete')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:work-order')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Delete work order successful')
  async deleteWorkOrder(
    @Req() { authUser }: Request,
    @Param('workOrderNo') workOrderNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.deleteWorkOrder(workOrderNo, authUser);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('view:work-orders')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('get list work order successful')
  async getListWorkOrder(
    @Query() query: GetWorkOrdersWithPaginationDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.getWorkOrdersWithPagination(query, sortBy);
  }

  @Get('/:workOrderNo')
  @UseGuards(PermissionsGuard)
  @Permissions('view:work-orders')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get work order successful')
  async getWorkOrderByNo(
    @Req() { authUser }: Request,
    @Param('workOrderNo') workOrderNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.workOrderService.getWorkOrderByNo(workOrderNo);
  }
}
