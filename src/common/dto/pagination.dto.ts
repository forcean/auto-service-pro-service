import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsNumber } from "class-validator";


export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1)
  limit: number = 20;
}
