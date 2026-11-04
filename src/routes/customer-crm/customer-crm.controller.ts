import { Controller, Get, Param, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { CustomerCrmListQueryDto } from './dtos/customer-crm.dto';
import { CustomerCrmService } from './customer-crm.service';

@Controller('crm/customers')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class CustomerCrmController {
  constructor(private readonly customerCrmService: CustomerCrmService) {}

  @Get()
  @ResponseResultCode('2000')
  @ResponseMessage('Get customer CRM successful')
  getCustomers(@Query() query: CustomerCrmListQueryDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.customerCrmService.findCustomers(query);
  }

  @Get(':phoneNumber')
  @ResponseResultCode('2000')
  @ResponseMessage('Get customer profile successful')
  getCustomer(@Param('phoneNumber') phoneNumber: string, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.customerCrmService.findCustomerDetail(phoneNumber);
  }

  private ensureAuthenticated(authUser: Request['authUser']): asserts authUser {
    if (!authUser) throw new BusinessException('4013', 'No auth user found');
  }
}
