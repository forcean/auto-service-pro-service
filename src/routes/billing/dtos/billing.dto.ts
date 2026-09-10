import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { EInvoiceStatus, EPaymentMethod } from '../enums/billing.enum';

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

export class VoidInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class InvoiceListQueryDto extends PaginationQuery {
  @IsOptional()
  @IsEnum(EInvoiceStatus)
  status?: EInvoiceStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsDateString()
  issuedFrom?: string;

  @IsOptional()
  @IsDateString()
  issuedTo?: string;
}

export class PaymentListQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(EPaymentMethod)
  method?: EPaymentMethod;

  @IsOptional()
  @IsDateString()
  paidFrom?: string;

  @IsOptional()
  @IsDateString()
  paidTo?: string;
}
