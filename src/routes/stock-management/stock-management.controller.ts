import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import {
  AdjustStockDto,
  getMovementListDto,
  IssueStockDto,
  ReceiveStockDto,
  ReleaseReservationDto,
  ReserveStockDto,
  ReturnStockDto,
  UpdateStockDto,
} from './dtos/stock-management.dto';

@Controller('stock-management')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class StockManagementController {
  constructor(
    private readonly stockManagementService: StockManagementService,
  ) {}

  @Get('stocks/:sku')
  // @Permissions('view:stock-detail')
  @ResponseResultCode('2000')
  @ResponseMessage('Get stock detail successful')
  async getStockDetail(@Param('sku') sku: string) {
    return this.stockManagementService.getStockDetailBySku(sku);
  }

  // @Get('stocks')
  // // @Permissions('view:stock-detail')
  // @ResponseResultCode('2000')
  // @ResponseMessage('Get stocks successful')
  // async getStocks() {
  //   return this.stockManagementService.getStockList();
  // }

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

  // POST /stocks/:productId/receive รับสินค้า
  @Post('stocks/:productId/receive')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Receive stock successful')
  async receiveStock(
    @Param('productId') productId: string,
    @Body() dto: ReceiveStockDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.receiveStock(productId, dto, authUser);
  }

  // POST /stocks/:productId/issue เบิกสินค้าออก/ขาย
  @Post('stocks/:productId/issue')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Issue stock successful')
  async issueStock(
    @Param('productId') productId: string,
    @Body() dto: IssueStockDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.issueStock(productId, dto, authUser);
  }

  // POST /stocks/:productId/reserve จองสินค้า
  @Post('stocks/:productId/reserve')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Reserve stock successful')
  async reserveStock(
    @Param('productId') productId: string,
    @Body() dto: ReserveStockDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.reserveStock(productId, dto, authUser);
  }

  // POST /stocks/:productId/release ปลดจองสินค้า
  @Post('stocks/:productId/release')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Release stock successful')
  async releaseStock(
    @Param('productId') productId: string,
    @Body() dto: ReleaseReservationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.releaseReservation(
      productId,
      dto,
      authUser,
    );
  }

  // POST /stocks/:productId/return คืนสินค้าเข้าคลัง
  @Post('stocks/:productId/return')
  // @Permissions('update:stock')
  @ResponseResultCode('2000')
  @ResponseMessage('Return stock successful')
  async returnStock(
    @Param('productId') productId: string,
    @Body() dto: ReturnStockDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.returnStock(productId, dto, authUser);
  }

  // POST /stocks/:productId/adjust ปรับยอดสต๊อกนับจริงแล้วแก้ยอด
  @Post('stocks/:productId/adjust')
  // @Permissions('update:stock')
  @ResponseResultCode('2000')
  @ResponseMessage('Adjust stock successful')
  async adjustStock(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.adjustStock(
      productId,
      dto,
      authUser,
    );
  }

  // GET /stocks/:productId/movements ดูประวัติการเคลื่อนไหว
  @Get('stocks/:productId/movements')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Get stock successful')
  async getMovementsByProduct(
    @Param('productId') productId: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.getMovementHistory(productId);
  }

  // GET /stock-movements ดู Movement ทั้งระบบ
  @Get('stock-movements')
  // @Permissions('delete:product')
  @ResponseResultCode('2000')
  @ResponseMessage('Get stock-movements successful')
  async getStocksMovement(
    @Query() dto: getMovementListDto,
    @Req() { authUser }: Request,
    @Query() pagination: PaginationQuery,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.stockManagementService.getMovementList(dto, pagination);
  }
}