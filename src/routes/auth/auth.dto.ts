import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { Unique } from 'typeorm';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @IsString()
  @IsNotEmpty()
  painTextPassword: string;
}
