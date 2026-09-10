import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EVehicleStatus } from '../enums/customers-vehicle.enum';
import { PaginationQuery } from 'src/common/dto/pagination.dto';

export class EngineDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  fuel!: string;
}

export class vehiclesDto {
  @IsString({ message: 'brand must be string' })
  @IsNotEmpty({ message: 'brand is required' })
  brand!: string;

  @IsString({ message: 'brandCode must be string' })
  @IsNotEmpty({ message: 'brandCode is required' })
  @IsUppercase({ message: 'brandCode must be uppercase' })
  brandCode!: string;

  @IsString({ message: 'model must be string' })
  @IsNotEmpty({ message: 'model is required' })
  model!: string;

  @IsString({ message: 'modelCode must be string' })
  @IsNotEmpty({ message: 'modelCode is required' })
  @IsUppercase({ message: 'modelCode must be uppercase' })
  modelCode!: string;

  @IsString({ message: 'generation must be string' })
  @IsNotEmpty({ message: 'generation is required' })
  generation!: string;

  @IsString({ message: 'platform must be a string' })
  @IsNotEmpty({ message: 'platform is required' })
  platform!: string;

  @IsNotEmpty({ message: 'yearFrom is required' })
  @Type(() => Number)
  @IsInt()
  yearFrom!: number;

  @IsNotEmpty({ message: 'yearTo is required' })
  @Type(() => Number)
  @IsInt()
  yearTo!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngineDto)
  @IsNotEmpty({ each: true })
  engines!: EngineDto[];

  @IsOptional()
  @IsString({ message: 'remark must be a string' })
  remark?: string;
}

export class customerVehicleDto {
  @IsString({ message: 'firstname must be a string' })
  @IsNotEmpty({ message: 'firstname is required' })
  firstname!: string;

  @IsString({ message: 'lastname must be a string' })
  @IsNotEmpty({ message: 'lastname is required' })
  lastname!: string;

  @IsString({ message: 'phoneNumber must be a string' })
  @IsNotEmpty({ message: 'phoneNumber is required' })
  @Matches(/^0\d{9}$/, {
    message: 'phoneNumber must start with 0 and contain exactly 10 digits',
  })
  phoneNumber!: string;

  @IsOptional()
  @IsString({ message: 'billingName must be a string' })
  billingName?: string;

  @IsOptional()
  @IsString({ message: 'taxId must be a string' })
  taxId?: string;

  @IsOptional()
  @IsString({ message: 'billingAddress must be a string' })
  billingAddress?: string;

  @IsOptional()
  @IsString({ message: 'branchNo must be a string' })
  branchNo?: string;

  @IsString({ message: 'licensePlate must be a string' })
  @IsNotEmpty({ message: 'licensePlate is required' })
  licensePlate!: string;

  @IsString({ message: 'province must be a string' })
  @IsNotEmpty({ message: 'province is required' })
  @IsUppercase({ message: 'province must be uppercase' })
  province!: string;

  @IsIn(Object.values(EVehicleStatus))
  @IsNotEmpty({ message: 'status is required' })
  @IsUppercase({ message: 'province must be uppercase' })
  status!: EVehicleStatus;

  @IsNotEmpty({ message: 'vin is required' })
  @IsString({ message: 'vin must be a string' })
  vin!: string;

  @IsOptional()
  @IsString({ message: 'engine_no must be a string' })
  engine_no?: string;

  @IsOptional()
  @IsString({ message: 'color must be a string' })
  color?: string;

  @IsNotEmpty({ message: 'mileage is required' })
  @IsString({ message: 'mileage must be a string' })
  mileage!: string;

  @IsNotEmpty()
  @Type(() => vehiclesDto)
  vehicle!: vehiclesDto;
}
export class updateCustomerVehicleDto {
  @IsOptional()
  @IsString({ message: 'firstname must be a string' })
  firstname?: string;

  @IsOptional()
  @IsString({ message: 'lastname must be a string' })
  lastname?: string;

  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string' })
  @Matches(/^0\d{9}$/, {
    message: 'phoneNumber must start with 0 and contain exactly 10 digits',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'billingName must be a string' })
  billingName?: string;

  @IsOptional()
  @IsString({ message: 'taxId must be a string' })
  taxId?: string;

  @IsOptional()
  @IsString({ message: 'billingAddress must be a string' })
  billingAddress?: string;

  @IsOptional()
  @IsString({ message: 'branchNo must be a string' })
  branchNo?: string;

  @IsOptional()
  @IsString({ message: 'licensePlate must be a string' })
  licensePlate!: string;

  @IsOptional()
  @IsString({ message: 'province must be a string' })
  province?: string;

  @IsOptional()
  @IsIn(Object.values(EVehicleStatus))
  status?: EVehicleStatus;

  @IsOptional()
  @IsString({ message: 'vin must be a string' })
  vin?: string;

  @IsOptional()
  @IsString({ message: 'engine_no must be a string' })
  engine_no?: string;

  @IsOptional()
  @IsString({ message: 'color must be a string' })
  color?: string;

  @IsOptional()
  @IsString({ message: 'mileage must be a string' })
  mileage?: string;

  @IsOptional()
  @Type(() => vehiclesDto)
  vehicle?: vehiclesDto;
}

export class getVehiclesDto {
  @IsOptional()
  @IsString({ message: 'brandCode must be a string' })
  @IsUppercase({ message: 'brandCode must be uppercase' })
  brandCode?: string;

  @IsOptional()
  @IsString({ message: 'modelCode must be a string' })
  @IsUppercase({ message: 'modelCode must be uppercase' })
  modelCode?: string;

  @IsOptional()
  @IsString({ message: 'generation must be a string' })
  generation?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;
}

export class getVehiclesWithPaginationDto extends PaginationQuery {
  @IsOptional()
  @IsString({ message: 'sort must be a string' })
  sort?: string;

  @IsOptional()
  @IsString({ message: 'licensePlate must be a string' })
  licensePlate?: string;

  @IsOptional()
  @IsString({ message: 'province must be a string' })
  @IsUppercase({ message: 'province must be uppercase' })
  province?: string;

  @IsOptional()
  @IsString({ message: 'status must be a string' })
  @IsUppercase({ message: 'status must be uppercase' })
  status?: string;

  @IsOptional()
  @IsString({ message: 'model must be a string' })
  @IsUppercase({ message: 'model must be uppercase' })
  model?: string;

  @IsOptional()
  @IsString({ message: 'brand must be a string' })
  @IsUppercase({ message: 'brand must be uppercase' })
  brand?: string;
}
