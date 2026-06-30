import {
  IsMongoId,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';
import { EStockMovementType, EStockReferenceType } from '../enums/stock.enum';

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

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEnum(EStockReferenceType)
  referenceType?: EStockReferenceType; //ประเภทของเหตุการณ์หรือเอกสารต้นทาง

  @IsOptional()
  @IsString()
  referenceId?: string; //ID ของเอกสารต้นทาง

  @IsOptional()
  @IsString()
  remark?: string;
}

export class IssueStockDto {
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
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReleaseReservationDto {
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

export class ReturnStockDto {
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

export class AdjustStockDto {
  @IsInt()
  @Min(0)
  actualQuantity!: number;

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

export class getMovementListDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  sku?: string;
  
  @IsString()
  @IsOptional()
  @IsEnum(EStockMovementType)
  movementType?: string;

 @IsString()
  @IsOptional()
  @IsEnum(EStockReferenceType)
  referenceType?: string;
}