import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { BillingService } from './billing.service';
import {
  CreatePaymentDto,
  CreateRefundDto,
  InvoiceListQueryDto,
  VoidInvoiceDto,
} from './dtos/billing.dto';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Controller('billing/invoices')
@UseGuards(PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('from-work-order/:workOrderId')
  @Permissions('create:invoice')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create invoice successful')
  create(@Param('workOrderId') workOrderId: string, @Req() req: Request) {
    if (!req.authUser)
      throw new BusinessException('4013', 'No auth user found');
    return this.billingService.createInvoice(workOrderId, req.authUser);
  }

  @Get()
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  list(
    @Query() query: InvoiceListQueryDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
  ) {
    return this.billingService.listInvoices(query, sortBy);
  }

  @Get('summary')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  summary() {
    return this.billingService.getSummary();
  }

  @Get('ready-work-orders')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  readyWorkOrders() {
    return this.billingService.getReadyToInvoiceWorkOrders();
  }

  @Get(':id')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  get(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  @Post(':id/payments')
  @Permissions('create:payment')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Receive payment successful')
  pay(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    if (!req.authUser)
      throw new BusinessException('4013', 'No auth user found');
    return this.billingService.receivePayment(id, dto, req.authUser);
  }

  @Patch(':id/void')
  @Permissions('void:invoice')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Void invoice successful')
  void(
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
    @Req() req: Request,
  ) {
    if (!req.authUser)
      throw new BusinessException('4013', 'No auth user found');
    return this.billingService.voidInvoice(id, dto, req.authUser);
  }

  @Post(':id/refunds')
  @Permissions('create:refund')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Refund successful')
  refund(
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
    @Req() req: Request,
  ) {
    if (!req.authUser)
      throw new BusinessException('4013', 'No auth user found');
    return this.billingService.refundPayment(id, dto, req.authUser);
  }

  @Get(':id/receipt')
  @Permissions('view:invoices')
  getReceipt(@Param('id') id: string) {
    return this.billingService.getReceipt(id);
  }

  @Get(':id/receipt/print')
  @Permissions('view:invoices')
  async printReceipt(@Param('id') id: string, @Res() response: Response) {
    response
      .type('html')
      .send(await this.billingService.getPrintableReceipt(id));
  }

  @Get(':id/audit-events')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  getAuditEvents(@Param('id') id: string) {
    return this.billingService.getAuditEvents(id);
  }

  @Get(':id/print')
  @Permissions('view:invoices')
  async printInvoice(@Param('id') id: string, @Res() response: Response) {
    response
      .type('html')
      .send(await this.billingService.getPrintableInvoice(id));
  }

  @Get(':id/service-history')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  getServiceHistory(@Param('id') id: string) {
    return this.billingService.getServiceHistory(id);
  }
}
