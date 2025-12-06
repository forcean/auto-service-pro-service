import { IsNotEmpty, IsString } from 'class-validator';

export class registerDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @IsString()
  @IsNotEmpty()
  painTextPassword: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  managerId?: string;

}