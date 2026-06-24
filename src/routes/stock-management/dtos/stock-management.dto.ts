import {
  IsMongoId,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EStockMovementType } from '../enums/stock.enum';

export class CreateStockDto {
  @IsMongoId()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class UpdateStockDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class ReceiveStockDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class IssueStockDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ReserveStockDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReleaseReservationDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class AdjustStockDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(0)
  actualQuantity!: number;
}

export class CreateStockMovementDto {
  productId!: string;
  sku!: string;
  movementType!: EStockMovementType
  quantity!: number;
  beforeQty!: number;
  afterQty!: number;
  referenceType?: string;

  referenceId?: string;

  remark?: string;
}