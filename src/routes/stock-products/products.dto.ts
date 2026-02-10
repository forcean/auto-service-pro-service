import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class vehiclesDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsInt()
  @IsNotEmpty()
  yearFrom: number;

  @IsInt()
  @IsNotEmpty()
  yearTo: number;

  @IsArray()
  @IsString()
  @IsNotEmpty()
  engine: string[];

  @IsString()
  @IsNotEmpty()
  remark: string;
}

export class priceDto {
  @IsInt()
  @IsNotEmpty()
  cost: number;

  @IsInt()
  @IsNotEmpty()
  retail: number;

  @IsInt()
  @IsNotEmpty()
  wholesale: number;
}

export class DimensionsDto {
  @IsString()
  @IsNotEmpty()
  width: string;

  @IsString()
  @IsNotEmpty()
  height: string;

  @IsString()
  @IsNotEmpty()
  depth: string;
}

export class specDto {
  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsNotEmpty()
  weight: number;

  @ValidateNested()
  @IsNotEmpty()
  dimensions: DimensionsDto;
}

export class mediaDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsBoolean()
  @IsNotEmpty()
  isPrimary: boolean;
}
export class createProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsArray()
  @IsNotEmpty()
  categoryPath: string[];

  @IsString()
  @IsNotEmpty()
  brandId: string;

  @ValidateNested({ each: true })
  @IsArray()
  @IsNotEmpty()
  vehicles: vehiclesDto[];

  @IsOptional()
  @ValidateNested()
  @IsNotEmpty()
  price?: priceDto;

  @IsOptional()
  @ValidateNested()
  @IsNotEmpty()
  spec?: specDto;

  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  images: mediaDto[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive','out_of_stock', 'discontinued'])
  status: string;

  @IsBoolean()
  @IsNotEmpty()
  isDeleted: boolean;
}

export class getProductCategoriesDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSelectable?: boolean;
}