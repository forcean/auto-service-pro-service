import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EVehicleStatus } from '../enums/customers-vehicle.enum';

export class EngineDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  fuel!: string;
}

export class vehiclesDto {
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsString()
  @IsNotEmpty()
  brandCode!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsString()
  @IsNotEmpty()
  modelCode!: string;

  @IsString()
  @IsNotEmpty()
  generation!: string;

  @IsString()
  @IsNotEmpty()
  platform!: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  yearFrom!: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  yearTo!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngineDto)
  @IsNotEmpty({ each: true })
  engines!: EngineDto[];

  @IsString()
  @IsOptional()
  remark?: string;
}

export class customerVehicleDto {
  @IsString({message: 'firstname must be a string'})
  @IsNotEmpty({message: 'firstname is required'})
  firstname!: string;

  @IsString({message: 'lastname must be a string'})
  @IsNotEmpty({message: 'lastname is required'})
  lastname!: string;

  @IsString({ message: 'phoneNumber must be a string' })
  @IsNotEmpty({ message: 'phoneNumber is required' })
  @Matches(/^0\d{9}$/, {
    message: 'phoneNumber must start with 0 and contain exactly 10 digits',
  })
  phoneNumber!: string;

  @IsString({message: 'licensePlate must be a string'})
  @IsNotEmpty({message: 'licensePlate is required'})
  licensePlate!: string;

  @IsString({message: 'province must be a string'})
  @IsNotEmpty({message: 'province is required'})
  province!: string;

  @IsIn(Object.values(EVehicleStatus))
  @IsNotEmpty({message: 'status is required'})
  status!: EVehicleStatus;

  @IsNotEmpty()
  @Type(() => vehiclesDto)
  vehicle!: vehiclesDto;
}
export class updateCustomerVehicleDto {

  @IsOptional()
  @IsString({message: 'firstname must be a string'})
  firstname?: string;

  @IsOptional()
  @IsString({message: 'lastname must be a string'})
  lastname?: string;

  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string' })
  @Matches(/^0\d{9}$/, {
    message: 'phoneNumber must start with 0 and contain exactly 10 digits',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString({message: 'licensePlate must be a string'})
  licensePlate!: string;

  @IsOptional()
  @IsString({message: 'province must be a string'})
  province?: string;

  @IsOptional()
  @IsIn(Object.values(EVehicleStatus))
  status?: EVehicleStatus;

  @IsOptional()
  @Type(() => vehiclesDto)
  vehicle?: vehiclesDto;
}
