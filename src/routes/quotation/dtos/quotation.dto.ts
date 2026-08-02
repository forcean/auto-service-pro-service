import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum EQuotationItemType {
  PART = 'PART',
  LABOR = 'LABOR',
  SERVICE = 'SERVICE',
}

export class CreateQuotationItemDto {
  @IsEnum(EQuotationItemType)
  itemType!: EQuotationItemType;

  // ใช้ ProductId เป็นตัวอ้างอิง
  @ValidateIf((o) => o.itemType === EQuotationItemType.PART)
  @IsMongoId()
  productId?: string;

  @ValidateIf((o) => o.itemType === EQuotationItemType.PART)
  @IsString()
  sku?: string;

  // LABOR / SERVICE
  @ValidateIf((o) => o.itemType !== EQuotationItemType.PART)
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  // PART ไม่ต้องส่งราคา
  @ValidateIf((o) => o.itemType !== EQuotationItemType.PART)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateQuotationDto {
  @IsMongoId()
  workOrderId!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  includeVat?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  customerRemark?: string;

  @IsOptional()
  @IsString()
  internalRemark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {}