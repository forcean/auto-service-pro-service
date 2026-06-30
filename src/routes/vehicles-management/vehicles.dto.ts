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
  @IsString({message: 'transaction_id must be a string'})
  @IsNotEmpty({message: 'transaction_id is required'})
  firstname!: string;

  @IsString({message: 'transaction_id must be a string'})
  @IsNotEmpty({message: 'transaction_id is required'})
  lastname!: string;

  @IsString({ message: 'mobile_no must be a string' })
  @IsNotEmpty({ message: 'mobile_no is required' })
  @Matches(/^0\d{9}$/, {
    message: 'mobile_no must start with 0 and contain exactly 10 digits',
  })
  phoneNumber!: string;

  @IsString({message: 'transaction_id must be a string'})
  @IsNotEmpty({message: 'transaction_id is required'})
  licensePlate!: string;

  @IsString({message: 'transaction_id must be a string'})
  @IsNotEmpty({message: 'transaction_id is required'})
  province!: string;

  @IsNotEmpty()
  @Type(() => vehiclesDto)
  vehicle!: vehiclesDto;
}
