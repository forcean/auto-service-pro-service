import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { CounterRepository } from 'src/repository/counters/counter.repository';
import {
  AppointmentEntity,
  AppointmentStatus,
  AppointmentType,
} from 'src/repository/appointment/appointment.schema';
import { AppointmentRepository } from 'src/repository/appointment/appointment.repository';
import { AuthUser } from 'src/types/user.type';
import {
  CreateAppointmentDto,
  GetAppointmentsDto,
  UpdateAppointmentDto,
} from './dtos/appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @Inject(AppointmentRepository)
    private readonly appointmentRepository: AppointmentRepository,
    @Inject(CounterRepository)
    private readonly counterRepository: CounterRepository,
  ) {}

  async getAppointments(query: GetAppointmentsDto) {
    if (query.from >= query.to) {
      throw new BusinessException('4001', 'The appointment range is invalid');
    }

    const appointments = await this.appointmentRepository.findInRange(
      query.from,
      query.to,
    );
    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async create(dto: CreateAppointmentDto, user: AuthUser) {
    const appointment = await this.appointmentRepository.create(
      this.toCreatePayload(dto),
      user,
    );
    return this.toResponse(appointment);
  }

  async update(id: string, dto: UpdateAppointmentDto, user: AuthUser) {
    const existing = await this.getById(id);
    if (
      dto.status === 'CHECKED_IN' &&
      existing.status !== 'CHECKED_IN'
    ) {
      throw new BusinessException('4001', 'Use the check-in endpoint to assign a queue number');
    }
    if (
      existing.status === 'CHECKED_IN' &&
      dto.appointmentType !== undefined &&
      dto.appointmentType !== 'VEHICLE_DROPOFF'
    ) {
      throw new BusinessException('4001', 'A checked-in queue must remain a vehicle drop-off');
    }

    const payload = this.toPayload(dto);
    const status = dto.status as AppointmentStatus | undefined;
    const notificationChanged =
      dto.notificationStatus !== undefined &&
      dto.notificationStatus !== existing.notificationStatus;

    const updated = await this.appointmentRepository.update(
      id,
      {
        ...payload,
        ...(status ? { status } : {}),
        ...(notificationChanged && dto.notificationStatus !== 'NOT_NOTIFIED'
          ? { notifiedAt: new Date(), notifiedBy: user.publicId }
          : {}),
      },
      user,
    );

    if (!updated) {
      throw new BusinessException('5003', 'Failed to update appointment');
    }
    return this.toResponse(updated);
  }

  async checkIn(id: string, user: AuthUser) {
    const existing = await this.getById(id);
    if (existing.status === 'CHECKED_IN') {
      return this.toResponse(existing);
    }
    // Appointments made before types were introduced used the drop-off flow.
    if ((existing.appointmentType ?? 'VEHICLE_DROPOFF') !== 'VEHICLE_DROPOFF') {
      throw new BusinessException('4001', 'Only vehicle drop-off appointments can be checked in');
    }
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(existing.status)) {
      throw new BusinessException('4001', 'This appointment cannot be checked in');
    }

    const queueDate = this.getBangkokDay(new Date());
    const queueNumber = await this.counterRepository.getNextSequence(
      `APPOINTMENT_QUEUE_${queueDate}`,
    );
    const updated = await this.appointmentRepository.checkIn(
      id,
      queueDate,
      queueNumber,
      user,
    );

    if (!updated) {
      throw new BusinessException('4090', 'The appointment status changed. Please refresh and try again');
    }
    return this.toResponse(updated);
  }

  private async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BusinessException('4040', 'Appointment not found');
    }
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new BusinessException('4040', 'Appointment not found');
    }
    return appointment;
  }

  private toPayload(dto: CreateAppointmentDto | UpdateAppointmentDto) {
    return {
      ...(dto.customerName !== undefined
        ? { customerName: dto.customerName.trim() }
        : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber.trim() } : {}),
      ...(dto.licensePlate !== undefined
        ? { licensePlate: dto.licensePlate.trim() || undefined }
        : {}),
      ...(dto.province !== undefined
        ? { province: dto.province.trim().toUpperCase() || undefined }
        : {}),
      ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType.trim() } : {}),
      ...(dto.appointmentType !== undefined
        ? { appointmentType: dto.appointmentType as AppointmentType }
        : {}),
      ...(dto.appointmentAt !== undefined ? { appointmentAt: dto.appointmentAt } : {}),
      ...(dto.durationMinutes !== undefined
        ? { durationMinutes: dto.durationMinutes }
        : {}),
      ...(dto.notificationStatus !== undefined
        ? { notificationStatus: dto.notificationStatus }
        : {}),
      ...(dto.note !== undefined ? { note: dto.note.trim() || undefined } : {}),
    };
  }

  private toCreatePayload(dto: CreateAppointmentDto) {
    return {
      customerName: dto.customerName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      licensePlate: dto.licensePlate?.trim() || undefined,
      province: dto.province?.trim().toUpperCase() || undefined,
      serviceType: dto.serviceType.trim(),
      appointmentType: dto.appointmentType ?? 'VEHICLE_DROPOFF',
      appointmentAt: dto.appointmentAt,
      durationMinutes: dto.durationMinutes ?? 30,
      notificationStatus: dto.notificationStatus ?? 'NOT_NOTIFIED',
      note: dto.note?.trim() || undefined,
    };
  }

  private toResponse(appointment: any) {
    const { _id, appointmentType, ...data } = appointment as AppointmentEntity & { _id: unknown };
    return {
      ...data,
      // Existing appointments were all vehicle drop-off appointments before
      // the calendar supported multiple kinds of dates.
      appointmentType: appointmentType ?? 'VEHICLE_DROPOFF',
      id: String(_id),
    };
  }

  private getBangkokDay(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
}
