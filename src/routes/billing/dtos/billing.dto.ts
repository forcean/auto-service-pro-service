import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EPaymentMethod } from '../enums/billing.enum';

export class CreateInvoiceDto {
  @IsMongoId() 
  workOrderId!: string;
}

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(EPaymentMethod)
  method!: EPaymentMethod;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRefundDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
