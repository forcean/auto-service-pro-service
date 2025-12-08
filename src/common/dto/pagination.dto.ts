import { IsOptional, IsInt, Min, IsNumber } from "class-validator";


export class PaginationQuery {
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  limit: number = 20;
}
