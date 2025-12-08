import { Controller } from '@nestjs/common';
import { Get, Body, Post, Req, Param, Query } from '@nestjs/common';
import type { Request } from 'express';
import { registerDto, getUserQueryParamsDto } from './user-manage.dto';
import { UserManageService } from './user-manage.service';
import { PaginationQuery } from 'src/common/dto/pagination.dto';



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

  @Post(':publicId')
  async delUserByPublicId(
    @Param('publicId') id: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new Error('No auth user found');
    }
    await this.userManageService.delUserByPublicId(id, authUser.role);
    return {
      message: 'Delete user successful',
    };
  }

  @Get('getUsers')
  async getUserBymanagerId(
    @Req() { authUser }: Request,
    @Query() pagination: PaginationQuery,
    @Query() param: getUserQueryParamsDto
  ) { 
    if (!authUser) {
      throw new Error('No auth user found');
    }
    const getUsers = await this.userManageService.getUserswithPagination(authUser.role, param, pagination);
    return {
      message: 'Get users successful',
      resultData: getUsers,
    };
  }

}