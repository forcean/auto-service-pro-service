import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Request } from 'express';

import { Permissions } from 'src/common/permission/permission.decorator';
import { PermissionsGuard } from 'src/common/permission/permission.guard';

import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';

import { ResponseInterceptor } from 'src/common/response/response.interceptor';

import { BusinessException } from 'src/common/exceptions/business.exception';

import { PaginationQuery } from 'src/common/dto/pagination.dto';

import { StockManagementService } from './stock-management.service';

@Controller('stock-management')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class StockManagementController {
  constructor(
    private readonly stockManagementService: StockManagementService,
  ) {}

  @Get('stocks/:sku')
  @Permissions('view:product-detail')
  @ResponseResultCode('2000')
  @ResponseMessage('Get stock detail successful')
  async getStockDetail(@Param('sku') sku: string) {
    return this.stockManagementService.getStockDetail(sku);
  }

  @Delete('stocks/:sku')
  @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Delete stock successful')
  async deleteStock(@Param('sku') sku: string, @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.deleteStock(sku, authUser);
  }
}
