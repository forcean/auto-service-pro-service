import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, CustomerListQueryDto, UpdateCustomerDto } from './dtos/customer.dto';

@Controller('customers')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ResponseResultCode('2000')
  @ResponseMessage('Get customers successful')
  list(@Query() query: CustomerListQueryDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.customerService.list(query);
  }

  @Post()
  @ResponseResultCode('2001')
  @ResponseMessage('Create customer successful')
  create(@Body() dto: CreateCustomerDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.customerService.create(dto, authUser!);
  }

  @Get(':customerId')
  @ResponseResultCode('2000')
  @ResponseMessage('Get customer successful')
  async get(@Param('customerId') customerId: string, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    const customer = await this.customerService.get(customerId);
    if (!customer) throw new BusinessException('4040', 'Customer not found');
    return customer;
  }

  @Patch(':customerId')
  @ResponseResultCode('2000')
  @ResponseMessage('Update customer successful')
  update(@Param('customerId') customerId: string, @Body() dto: UpdateCustomerDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.customerService.update(customerId, dto, authUser!);
  }

  private ensureAuthenticated(authUser: Request['authUser']): asserts authUser {
    if (!authUser) throw new BusinessException('4013', 'No auth user found');
  }
}
