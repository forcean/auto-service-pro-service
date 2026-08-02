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
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import type { Request } from 'express';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { QuotationService } from './services/quotation.service';
import { CreateQuotationDto } from './dtos/quotation.dto';

@Controller('quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create quotation successful')
  async createWorkOrder(
    @Body() data: CreateQuotationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.createQuotation(data, authUser);
  }
}
