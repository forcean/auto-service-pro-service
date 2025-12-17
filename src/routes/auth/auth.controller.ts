import { Controller, Body, Post, Res, Req, UseInterceptors } from '@nestjs/common';
import type { Response, Request } from 'express';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import { refreshTokenDto } from './token.dto';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
// recheck ของข้างใน func ทั้งหมด
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('login')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode(2000)
  @ResponseMessage('User login successful')
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

    return userLogin;
    // return {
    //   message: 'Login successful',
    //   resultData: {
    //     accessToken: userLogin.accessToken,
    //     refreshToken: userLogin.refreshToken,
    //     accessTokenExpiresDt: userLogin.accessTokenExpiresDt,
    //     refreshTokenExpiresDt: userLogin.refreshTokenExpiresDt,

    //   }
    // };
  }

  @Post('refresh')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode(2000)
  @ResponseMessage('Create new access token successful')
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

    return token;
    // return {
    //   message: 'Create new access token successful',
    //   resultData: {
    //     accessToken: token.accessToken,
    //     refreshToken: token.refreshToken,
    //     accessTokenExpiresDt: token.accessTokenExpiresDt,
    //     refreshTokenExpiresDt: token.refreshTokenExpiresDt,
    //   }
    // };
  }

  @Post('revoke')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode(2000)
  @ResponseMessage('User logout successful')
  async authlogout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    if (!req.cookies.accessToken) {
      throw new BusinessException(4012, 'No token provided');
    }
    const token = req.cookies.accessToken;
    await this.authService.revokeAccessToken(token);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // return {
    //   message: 'Logout successful',
    // };
  }
}