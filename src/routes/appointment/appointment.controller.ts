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
import type { Request } from 'express';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  GetAppointmentsDto,
  UpdateAppointmentDto,
} from './dtos/appointment.dto';

/**
 * Appointment routes intentionally have no permission metadata. The global
 * permission guard still requires an authenticated user, while Phase 1 allows
 * every signed-in workshop role to operate the reception queue.
 */
@Controller('appointments')
@UseGuards(PermissionsGuard)
@UseInterceptors(ResponseInterceptor)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @ResponseResultCode('2000')
  @ResponseMessage('Get appointments successful')
  async getAppointments(
    @Query() query: GetAppointmentsDto,
    @Req() { authUser }: Request,
  ) {
    this.ensureAuthenticated(authUser);
    return this.appointmentService.getAppointments(query);
  }

  @Post()
  @ResponseResultCode('2001')
  @ResponseMessage('Create appointment successful')
  async create(
    @Body() dto: CreateAppointmentDto,
    @Req() { authUser }: Request,
  ) {
    this.ensureAuthenticated(authUser);
    return this.appointmentService.create(dto, authUser!);
  }

  @Patch(':appointmentId')
  @ResponseResultCode('2000')
  @ResponseMessage('Update appointment successful')
  async update(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() { authUser }: Request,
  ) {
    this.ensureAuthenticated(authUser);
    return this.appointmentService.update(appointmentId, dto, authUser!);
  }

  @Post(':appointmentId/check-in')
  @ResponseResultCode('2000')
  @ResponseMessage('Check in appointment successful')
  async checkIn(
    @Param('appointmentId') appointmentId: string,
    @Req() { authUser }: Request,
  ) {
    this.ensureAuthenticated(authUser);
    return this.appointmentService.checkIn(appointmentId, authUser!);
  }

  private ensureAuthenticated(authUser: Request['authUser']): asserts authUser {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
  }
}
