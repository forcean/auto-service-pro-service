import { Controller } from '@nestjs/common';
import { Body, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { registerDto } from './user-manage.dto';
import { UserManageService } from './user-manage.service';


@Controller('user-management')
export class UserManageController {
  constructor(
    private readonly userManageService: UserManageService,
  ) { }

  @Post('register')
    async register(
      @Body() registerDto: registerDto,
      @Req() req: Request,
    ) {
      if (!req.cookies.accessToken) {
        throw new Error('No token provided');
      }
      const token = req.cookies?.accessToken;
      await this.userManageService.register(registerDto, token);
      return {
        message: 'Register successful',
      };
    }
  
    @Post('register/owner')
    async registerBy(
      @Body() registerDto: registerDto, privateKey: string,
    ) {
      await this.userManageService.createSysOwner(registerDto, privateKey);
      return {
        message: 'Register successful',
      };
    }
}