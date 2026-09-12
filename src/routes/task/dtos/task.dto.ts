import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUppercase,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ETaskPriority, ETaskStatus } from '../enums/task.enum';
import { PaginationQuery } from 'src/common/dto/pagination.dto';

export class AssignedMechanicDto {
  @IsMongoId()
  mechanicId!: string;

  @IsOptional()
  @IsString()
  mechanicName?: string;
}

export class CreateWorkOrderTaskDto {
  @IsString()
  @IsNotEmpty()
  @IsUppercase()
  @Matches(/^WO\d{10}$/, {
    message: 'workOrderNo format must be WOYYYYNNNNNN',
  })
  workOrderNo!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ETaskPriority)
  priority?: ETaskPriority;

  @IsOptional()
  @IsEnum(ETaskStatus)
  status?: ETaskStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualMinute?: number;

  // Planned schedule
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignedMechanicDto)
  mechanics?: AssignedMechanicDto[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  isRework?: boolean;
}

export class UpdateWorkOrderTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ETaskPriority)
  priority?: ETaskPriority;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualMinute?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignedMechanicDto)
  mechanics?: AssignedMechanicDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateTaskStatusDto {
  @IsEnum(ETaskStatus)
  status!: ETaskStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ReportAdditionalProblemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class ApproveAdditionalProblemDto {
  @IsMongoId()
  quotationId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateMinute?: number;
}

export class getWorkOrderTasksWithPaginationDto extends PaginationQuery {
  @IsString({ message: 'sort must be a string' })
  @IsOptional()
  sort?: string;

  @IsOptional()
  @IsString({ message: 'status must be a string' })
  @IsUppercase({ message: 'status must be uppercase' })
  status?: string;

  @IsOptional()
  @IsString({
    message: 'workOrderNo must be a string',
  })
  @IsUppercase({
    message: 'workOrderNo must be uppercase',
  })
  @Matches(/^WO\d{10}$/, {
    message: 'workOrderNo format must be WOYYYYNNNNNN',
  })
  workOrderNo?: string;

  @IsOptional()
  @IsString({
    message: 'taskNo must be a string',
  })
  @IsUppercase({
    message: 'taskNo must be uppercase',
  })
  @Matches(/^WO\d{10}-T\d{3}$/, {
    message: 'taskNo format must be WOYYYYNNNNNN-TNNN',
  })
  taskNo?: string;
}
