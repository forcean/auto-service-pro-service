import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DailyReportQueryDto {
  @IsDateString()
  date!: string;
}

export class CloseDailyDto extends DailyReportQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  declaredCash!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
