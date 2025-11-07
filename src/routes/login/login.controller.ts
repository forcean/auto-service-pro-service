import { Controller, Body, Post, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { LoginDto, registerDto } from './login.dto';
import { LoginService } from './login.service';

// recheck ของข้างใน func ทั้งหมด
@Controller('auth')
export class LoginController { 
  constructor(
    private readonly loginService: LoginService,
  ) { }

  @Post('login')
  async loginByPublicId(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userLogin = await this.loginService.loginByPublicId(loginDto);
    res.cookie('accessToken', userLogin.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
    });

    res.cookie('refreshToken', userLogin.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return{
      message: 'Login successful',
      data: {
        accessToken: userLogin.accessToken,
        refreshToken: userLogin.refreshToken,
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
    await this.loginService.register(registerDto, token);
    return {
      message: 'Register successful',
    };
  }

  @Post('register/owner')
  async registerBy(
    @Body() registerDto: registerDto,
  ) {
    await this.loginService.createSysOwner(registerDto);
    return {
      message: 'Register successful',
    };
  }
}