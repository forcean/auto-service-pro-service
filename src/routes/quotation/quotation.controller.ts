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
import {
  ApproveQuotationDto,
  CreateQuotationDto,
  getQuotationWithPaginationDto,
  RejectQuotationDto,
  UpdateQuotationDto,
} from './dtos/quotation.dto';

@Controller('quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  // create quotation ref work order
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create quotation successful')
  async createWorkOrder(
    @Body() dto: CreateQuotationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.createQuotation(dto, authUser);
  }
  
  // when customer approve quotation, update status to approved
  @Patch(':quotationNo/approve')
  @UseGuards(PermissionsGuard)
  @Permissions('approve:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Approve quotation successful')
  async approveQuotation(
    @Param('quotationNo') quotationNo: string,
    @Body() dto: ApproveQuotationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.approveQuotation(quotationNo, dto, authUser);
  }

  @Patch(':quotationNo/reject')
  @UseGuards(PermissionsGuard)
  @Permissions('approve:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Reject quotation successful')
  async rejectQuotation(
    @Param('quotationNo') quotationNo: string,
    @Body() body: RejectQuotationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.rejectQuotation(quotationNo, body.reason, authUser);
  }

  @Post(':quotationNo/revision')
  @UseGuards(PermissionsGuard)
  @Permissions('create:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create quotation revision successful')
  async createRevision(@Param('quotationNo') quotationNo: string, @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.createRevision(quotationNo, authUser);
  }

  @Patch('expire')
  @UseGuards(PermissionsGuard)
  @Permissions('system:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Expire quotation successful')
  async expireQuotation() {
    return this.quotationService.expireQuotation();
  }

  @Post(':quotationNo/delete')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Delete quotation successful')
  async deleteQuotation(@Param('quotationNo') quotationNo: string, @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.deleteQuotation(quotationNo, authUser);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('view:quotations')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('get list quotation successful')
  async getListWorkOrder(
    @Query() query: getQuotationWithPaginationDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.getQuotationWithPagination(query, sortBy);
  }

  @Get('/:quotationNo')
  @UseGuards(PermissionsGuard)
  @Permissions('view:quotations')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get work order successful')
  async getWorkOrderByNo(
    @Req() { authUser }: Request,
    @Param('quotationNo') quotationNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.getQuotationByNo(quotationNo);
  }

  @Patch(':quotationNo')
  @UseGuards(PermissionsGuard)
  @Permissions('update:quotation')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update quotation successful')
  async updateQuotation(
    @Param('quotationNo') quotationNo: string,
    @Body() dto: UpdateQuotationDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.quotationService.updateQuotation(quotationNo, dto, authUser);
  }
}
