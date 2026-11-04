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
import { Permissions } from 'src/common/permission/permission.decorator';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { BusinessException } from 'src/common/exceptions/business.exception';
import type { Request } from 'express';
import {
  CreateQuotationPresetDto,
  GetQuotationPresetDto,
  UpdateQuotationPresetDto,
} from './dtos/quotation-preset.dto';
import { QuotationPresetService } from './quotation-preset.service';

@Controller('quotation-presets')
export class QuotationPresetController {
  constructor(private readonly quotationPresetService: QuotationPresetService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('view:quotations')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get quotation presets successful')
  async getAll(@Query() query: GetQuotationPresetDto) {
    return this.quotationPresetService.getAll(query);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create quotation preset successful')
  async create(
    @Body() dto: CreateQuotationPresetDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.quotationPresetService.create(dto, authUser);
  }

  @Patch(':presetId')
  @UseGuards(PermissionsGuard)
  @Permissions('update:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update quotation preset successful')
  async update(
    @Param('presetId') presetId: string,
    @Body() dto: UpdateQuotationPresetDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.quotationPresetService.update(presetId, dto, authUser);
  }
}
