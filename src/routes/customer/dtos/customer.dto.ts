import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

import { PaginationQuery } from 'src/common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  firstname!: string;

  @IsString()
  @IsNotEmpty()
  lastname!: string;

  @IsString()
  @Matches(/^0\d{9}$/)
  phoneNumber!: string;

  @IsOptional() @IsString() billingName?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() billingAddress?: string;
  @IsOptional() @IsString() branchNo?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CustomerListQueryDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  search?: string;
}
