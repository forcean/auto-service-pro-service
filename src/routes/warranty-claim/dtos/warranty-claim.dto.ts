import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import type { WarrantyClaimStatus } from 'src/repository/warranty-claim/warranty-claim.schema';

export class CreateWarrantyClaimDto {
  @IsString()
  workOrderNo!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  warrantyDays?: number;
}

export class ApproveWarrantyClaimDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileage!: number;
}

export class RejectWarrantyClaimDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class WarrantyClaimQueryDto {
  @IsOptional()
  @IsEnum(['OPEN', 'APPROVED', 'REJECTED', 'CLOSED'])
  status?: WarrantyClaimStatus;
}
