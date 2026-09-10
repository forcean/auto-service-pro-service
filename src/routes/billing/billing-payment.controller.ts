import { Controller, Get, Param, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { Permissions } from 'src/common/permission/permission.decorator';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { ResponseResultCode } from 'src/common/response/response.decorator';
import { BillingService } from './billing.service';
import { PaymentListQueryDto } from './dtos/billing.dto';

@Controller('billing/payments')
@UseGuards(PermissionsGuard)
export class BillingPaymentController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  list(@Query() query: PaymentListQueryDto) {
    return this.billingService.listPayments(query);
  }

  @Get(':paymentNo/receipt')
  @Permissions('view:invoices')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  receipt(@Param('paymentNo') paymentNo: string) {
    return this.billingService.getPaymentReceipt(paymentNo);
  }

  @Get(':paymentNo/receipt/print')
  @Permissions('view:invoices')
  async printReceipt(@Param('paymentNo') paymentNo: string, @Res() response: Response) {
    response.type('html').send(await this.billingService.getPrintablePaymentReceipt(paymentNo));
  }
}
