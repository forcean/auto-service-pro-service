import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUppercase,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaginationQuery } from 'src/common/dto/pagination.dto';
import {
  EPartIssueReason,
  EPartIssueStatus,
} from '../enums/part-issue.enum';

/**
 * ============================================================
 * Create Part Issue
 * ============================================================
 *
 * สร้างเอกสาร Part Issue
 *
 * ยังไม่ Reserve
 * ยังไม่ตัด Stock
 */
export class CreatePartIssueItemDto {
  @IsMongoId()
  productId!: string;

  /**
   * Snapshot SKU
   */
  @IsString()
  @IsNotEmpty()
  @IsUppercase()
  sku!: string;

  /**
   * Snapshot Product Name
   */
  @IsString()
  @IsNotEmpty()
  productName!: string;

  /**
   * จำนวนที่ต้องการเบิก
   */
  @IsNumber()
  @Min(1)
  requestedQty!: number;

  /**
   * เหตุผลในการเบิก
   */
  @IsEnum(EPartIssueReason)
  reason!: EPartIssueReason;

  /**
   * เป็นอะไหล่เพิ่มเติมที่คิดเงินลูกค้าหรือไม่
   */
  @IsBoolean()
  isAdditionalCharge!: boolean;

  /**
   * ราคาต่อหน่วย ณ ตอนเบิก
   */
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreatePartIssueDto {
  @IsString()
  @IsNotEmpty()
  @IsUppercase()
  @Matches(/^WO\d{10}$/, {
    message: 'workOrderNo format must be WOYYYYNNNNNN',
  })
  workOrderNo!: string;

  @IsString()
  @IsNotEmpty()
  @IsUppercase()
  @Matches(/^WO\d{10}-T\d{3}$/, {
    message: 'taskNo format must be WOYYYYNNNNNN-TNNN',
  })
  taskNo!: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePartIssueItemDto)
  items!: CreatePartIssueItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * ============================================================
 * Issue Part
 * ============================================================
 *
 * Store จ่ายอะไหล่จริง
 *
 * reservedQty ↓
 * issuedQty ↑
 *
 * และ Stock:
 * quantity ↓
 * reserved ↓
 */
export class IssuePartIssueItemDto {
  @IsMongoId()
  productId!: string;

  /**
   * จำนวนที่จ่ายจริง
   */
  @IsNumber()
  @Min(1)
  issuedQty!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class IssuePartIssueDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => IssuePartIssueItemDto)
  items!: IssuePartIssueItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * ============================================================
 * Cancel Part Issue
 * ============================================================
 */
export class CancelPartIssueDto {
  @IsString()
  @IsNotEmpty()
  remark!: string;
}

/**
 * ============================================================
 * Get Part Issues
 * ============================================================
 */
export class GetPartIssueWithPaginationDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  @IsUppercase()
  @Matches(/^PI\d{10}$/, {
    message: 'issueNo format must be PIYYYYNNNNNN',
  })
  issueNo?: string;

  @IsOptional()
  @IsString()
  @IsUppercase()
  @Matches(/^WO\d{10}$/, {
    message: 'workOrderNo format must be WOYYYYNNNNNN',
  })
  workOrderNo?: string;

  @IsOptional()
  @IsString()
  @IsUppercase()
  @Matches(/^WO\d{10}-T\d{3}$/, {
    message: 'taskNo format must be WOYYYYNNNNNN-TNNN',
  })
  taskNo?: string;

  @IsOptional()
  @IsEnum(EPartIssueStatus)
  status?: EPartIssueStatus;

  @IsOptional()
  @IsEnum(EPartIssueReason)
  reason?: EPartIssueReason;

  @IsOptional()
  @IsString()
  @IsUppercase()
  sku?: string;
}