import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQuery } from 'src/common/dto/pagination.dto';

export class CustomerCrmListQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
