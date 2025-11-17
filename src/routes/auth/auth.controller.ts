import { Controller, Body, Post, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { LoginDto, registerDto } from './auth.dto';
import { AuthService } from './auth.service';
import { refreshTokenDto } from './token.dto';
import { access } from 'fs';
// recheck ของข้างใน func ทั้งหมด
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('login')
  async loginByPublicId(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userLogin = await this.authService.loginByPublicId(loginDto);

    const accessTokenExpiresDt = new Date(userLogin.accessTokenExpiresDt).getTime();
    const refreshTokenExpiresDt = new Date(userLogin.refreshTokenExpiresDt).getTime();

    res.cookie('accessToken', userLogin.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: accessTokenExpiresDt - Date.now(), // 1 hour
    });

    res.cookie('refreshToken', userLogin.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: refreshTokenExpiresDt - Date.now(), // 7 days
    });
    return {
      message: 'Login successful',
      data: {
        accessToken: userLogin.accessToken,
        refreshToken: userLogin.refreshToken,
        accessTokenExpiresDt: userLogin.accessTokenExpiresDt,
        refreshTokenExpiresDt: userLogin.refreshTokenExpiresDt,

      }
    };
  }

  @Post('register')
  async register(
    @Body() registerDto: registerDto,
    @Req() req: Request,
  ) {
    if (!req.cookies.accessToken) {
      throw new Error('No token provided');
    }
    const token = req.cookies?.accessToken;
    // const userRegister = 
    await this.authService.register(registerDto, token);
    return {
      message: 'Register successful',
    };
  }

  @Post('register/owner')
  async registerBy(
    @Body() registerDto: registerDto,
  ) {
    await this.authService.createSysOwner(registerDto);
    return {
      message: 'Register successful',
    };
  }

  @Post('refresh')
  async getRefreshTokens(
    @Body() refreshTokenDto: refreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.createNewAccessToken(refreshTokenDto);

    const accessTokenExpiresDt = new Date(token.accessTokenExpiresDt).getTime();
    const refreshTokenExpiresDt = new Date(token.refreshTokenExpiresDt).getTime();

    res.cookie('accessToken', token.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: accessTokenExpiresDt - Date.now(), // 1 hour
    });

    res.cookie('refreshToken', token.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: refreshTokenExpiresDt - Date.now(), // 7 days
    });

    return {
      message: 'Create new access token successful',
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        accessTokenExpiresDt: token.accessTokenExpiresDt,
        refreshTokenExpiresDt: token.refreshTokenExpiresDt,
      }
    };
  }
}