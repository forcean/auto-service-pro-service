import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer"
export class EngineDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  fuel!: string;
}

export class vehiclesDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  yearFrom!: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  yearTo!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngineDto)
  @IsNotEmpty({ each: true })
  engines!: EngineDto[];

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  remark?: string;
}

export class priceDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cost!: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  retail!: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(0)
  wholesale?: number;
}

export class specDto {
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsNotEmpty()
  weight!: string;

  @IsString()
  @IsNotEmpty()
  width!: string;

  @IsString()
  @IsNotEmpty()
  height!: string;

  @IsString()
  @IsNotEmpty()
  depth!: string;
}

export class mediaDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsBoolean()
  @IsNotEmpty()
  isPrimary!: boolean;
}

export class stockRequestDto{
    @IsInt()
    @IsNotEmpty()
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

export class createProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categoryPath!: string[];

  @IsString()
  @IsNotEmpty()
  brandId!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => vehiclesDto)
  @IsArray()
  @IsNotEmpty({ each: true })
  vehicles?: vehiclesDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => priceDto)
  @IsNotEmpty()
  price?: priceDto;

  @IsOptional()
  @Type(() => specDto)
  @ValidateNested()
  @IsNotEmpty()
  spec?: specDto;

  @IsArray()
  @IsNotEmpty({ each: true })
  @ValidateNested({ each: true })
  @Type(() => mediaDto)
  @IsNotEmpty()
  images!: mediaDto[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
  status!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => stockRequestDto)
  stockInfo?: stockRequestDto;

}

export class getProductCategoriesDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSelectable?: boolean;
}

export class updateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryPath?: string[];

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => vehiclesDto)
  @IsArray()
  @IsNotEmpty({ each: true })
  vehicles?: vehiclesDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => priceDto)
  @IsNotEmpty()
  price?: priceDto;

  @IsOptional()
  @Type(() => specDto)
  @ValidateNested()
  @IsNotEmpty()
  spec?: specDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => mediaDto)
  images?: mediaDto[];

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
  status?: string;
}

export class getProductListDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;
  
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isStocked?: boolean;
}