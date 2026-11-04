import { Body, Controller, Get, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { CloseDailyDto, DailyReportQueryDto } from './dtos/operations.dto';
import { OperationsService } from './operations.service';

@Controller('operations')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('reports/daily')
  @ResponseResultCode('2000')
  @ResponseMessage('Get daily management report successful')
  getReport(@Query() query: DailyReportQueryDto, @Req() { authUser }: Request) {
    this.ensureManager(authUser);
    return this.operationsService.getDailyReport(query.date);
  }

  @Post('daily-close')
  @ResponseResultCode('2001')
  @ResponseMessage('Close cash drawer successful')
  closeDaily(@Body() dto: CloseDailyDto, @Req() { authUser }: Request) {
    this.ensureAuthenticated(authUser);
    return this.operationsService.closeDaily(dto, authUser!);
  }

  private ensureManager(authUser: Request['authUser']): asserts authUser {
    this.ensureAuthenticated(authUser);
    this.operationsService.ensureManager(authUser!);
  }

  private ensureAuthenticated(authUser: Request['authUser']): asserts authUser {
    if (!authUser) throw new BusinessException('4013', 'No auth user found');
  }
}
