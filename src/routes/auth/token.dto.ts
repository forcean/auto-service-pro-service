import { IsNotEmpty, IsString } from "class-validator";

export class refreshTokenDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}