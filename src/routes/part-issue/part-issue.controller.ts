import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';

import { AuthUser } from 'src/types/user.type';
import {
  CancelPartIssueDto,
  CreatePartIssueDto,
  IssuePartIssueDto,
} from './dtos/part-issue.dto';
import { PartIssueService } from './service/part-issue.service';

import type { Request } from 'express';

import { Permissions } from 'src/common/permission/permission.decorator';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';

@Controller('part-issues')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class PartIssueController {
  constructor(private readonly partIssueService: PartIssueService) {}

  /**
   * ============================================================
   * CREATE
   * ============================================================
   *
   * สร้าง Part Issue
   *
   * ยังไม่ Reserve
   * ยังไม่ตัด Stock
   * ใช้กรณีที่ต้องการขอเบิกอะไหล่จาก Store ก่อนที่จะทำการจ่ายจริง
   */
  @Post()
  @Permissions('create:issue')
  @ResponseResultCode('2000')
  @ResponseMessage('Create issue successful')
  async createIssue(
    @Body() dto: CreatePartIssueDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.partIssueService.createIssue(dto, authUser);
  }

  /**
   * ============================================================
   * GET DETAIL
   * ============================================================
   *
   * ดูรายละเอียด Part Issue
   */
  @Get(':issueNo')
  @Permissions('view:issue')
  @ResponseResultCode('2000')
  @ResponseMessage('Get issue successful')
  async getIssueByNo(
    @Param('issueNo') issueNo: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.partIssueService.getIssueByNo(issueNo);
  }

  /**
   * ============================================================
   * RESERVE
   * ============================================================
   *
   * Reserve Stock ตาม Part Issue
   *
   * quantity ใน Stock ยังไม่ลด
   * reserved ใน Stock เพิ่มขึ้น
   * ใช้กรณีที่ต้องการจองอะไหล่ไว้ก่อนที่จะทำการจ่ายจริง เพื่อให้แน่ใจว่าอะไหล่ยังอยุ่ใน stock
   */
  @Post(':issueNo/reserve')
  // @Permissions('update:issue')
  @ResponseResultCode('2000')
  @ResponseMessage('Reserve issue successful')
  async reserve(
    @Param('issueNo') issueNo: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.partIssueService.reserve(issueNo, authUser);
  }

  /**
   * ============================================================
   * ISSUE
   * ============================================================
   *
   * Store จ่ายอะไหล่จริง
   *
   * quantity ↓
   * reserved ↓
   * issuedQty ↑
   * ใช้กรณีที่ต้องการจ่ายอะไหล่จริง ๆ ออกจาก Store
   * ถ้า Part Issue ยังไม่ได้ Reserve จะทำการ Reserve ให้ก่อน
   */
  @Post(':issueNo/issue')
  @Permissions('issue:issue')
  @ResponseResultCode('2000')
  @ResponseMessage('Issue issue successful')
  async issue(
    @Param('issueNo') issueNo: string,
    @Body() dto: IssuePartIssueDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return this.partIssueService.issue(issueNo, dto, authUser);
  }

  /**
   * ============================================================
   * CANCEL
   * ============================================================
   *
   * ยกเลิก Part Issue
   *
   * ถ้ามี reservation เหลืออยู่
   * Service จะ release ให้ก่อน
   */
  @Patch(':issueNo/cancel')
  @Permissions('cancel:issue')
  @ResponseResultCode('2000')
  @ResponseMessage('Cancel issue successful')
  async cancel(
    @Param('issueNo') issueNo: string,
    @Body() dto: CancelPartIssueDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.partIssueService.cancel(issueNo, dto, authUser);
  }
}
