import { Controller, ApiTags, Body, Post } from '@nestjs/common';
import { LoginDto } from './login.dto';
import { LoginService } from './login.service';


@Controller()
export class LoginController { 
  constructor(
    private readonly loginService: LoginService,
  ) { }


  @ApiTags('login')
  @Post('login')
  async loginByEmail(
    @Body() loginDto: LoginDto,
  ) {
    await this.loginService.loginByEmail(loginDto);
    return {
      message: 'Login successful',
    };
  }
}