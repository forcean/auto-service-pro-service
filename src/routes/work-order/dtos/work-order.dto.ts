import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EFuelLevel, EWorkOrderStatus } from '../enums/work-order.enum';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationQuery } from 'src/common/dto/pagination.dto';


export class ComplaintDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class InspectionItemDto {
  @IsString()
  item!: string;

  @IsEnum(['GOOD', 'WARNING', 'BAD'])
  status!: 'GOOD' | 'WARNING' | 'BAD';

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateWorkOrderDto {
  @IsMongoId()
  vehicleId!: string;

  @IsMongoId()
  customerId!: string;

  @IsNumber()
  mileage!: number;

  @IsOptional()
  @IsEnum(EFuelLevel)
  fuelLevel?: EFuelLevel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplaintDto)
  complaints!: ComplaintDto[];

  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  inspections?: InspectionItemDto[];

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  customerRemark?: string;

  @IsOptional()
  @IsString()
  internalRemark?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsDateString()
  expectedFinishDate?: string;

  @IsOptional()
  @IsMongoId()
  advisorId?: string;
}

export class UpdateWorkOrderDto extends PartialType(
  CreateWorkOrderDto,
) {}

export class UpdateWorkOrderStatusDto {
  @IsEnum(EWorkOrderStatus)
  status!: EWorkOrderStatus;
}

export class getWorkOrdersWithPaginationDto extends PaginationQuery {
  @IsString({ message: 'sort must be a string' })
  @IsOptional()
  sort?: string;
}
