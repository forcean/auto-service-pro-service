import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  APPOINTMENT_NOTIFICATION_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
} from 'src/repository/appointment/appointment.schema';
import type {
  AppointmentNotificationStatus,
  AppointmentStatus,
  AppointmentType,
} from 'src/repository/appointment/appointment.schema';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  serviceType!: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TYPES)
  appointmentType?: AppointmentType;

  @Type(() => Date)
  @IsDate()
  appointmentAt!: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(APPOINTMENT_NOTIFICATION_STATUSES)
  notificationStatus?: AppointmentNotificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  serviceType?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TYPES)
  appointmentType?: AppointmentType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appointmentAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;

  @IsOptional()
  @IsIn(APPOINTMENT_NOTIFICATION_STATUSES)
  notificationStatus?: AppointmentNotificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class GetAppointmentsDto {
  @Type(() => Date)
  @IsDate()
  from!: Date;

  @Type(() => Date)
  @IsDate()
  to!: Date;
}
