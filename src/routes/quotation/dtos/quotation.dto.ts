import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { EApprovalMethod } from '../enums/quotation.enum';

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

export class UpdateQuotationDto extends CreateQuotationDto {}

export class getQuotationWithPaginationDto extends PaginationQuery {
  @IsString({ message: 'sort must be a string' })
  @IsOptional()
  sort?: string;

  //   @IsString({ message: 'sort must be a string' })
  //   @IsOptional()
  //   sort?: string;
}
export class RejectQuotationDto {
  // @ApiProperty({
  //   example: 'ลูกค้าไม่อนุมัติราคา',
  //   description: 'เหตุผลที่ปฏิเสธใบเสนอราคา',
  //   maxLength: 500,
  // })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class ApproveQuotationDto {
  // @ApiProperty({
  //   enum: EApprovalMethod,
  //   example: EApprovalMethod.LINE,
  // })
  @IsEnum(EApprovalMethod)
  method!: EApprovalMethod;

  // @ApiProperty({
  //   example: 'สมชาย ใจดี',
  // })
  @IsString()
  @MaxLength(100)
  customerName!: string;

  // @ApiPropertyOptional({
  //   example: 'ลูกค้าอนุมัติผ่าน LINE',
  // })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
