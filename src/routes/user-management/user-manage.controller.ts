import { Controller } from '@nestjs/common';
import { Get, Body, Post, Req, Param, Query, Patch } from '@nestjs/common';
import type { Request } from 'express';
import { registerDto, getUserQueryParamsDto, updateUserDto } from './user-manage.dto';
import { UserManageService } from './user-manage.service';
import { PaginationQuery } from 'src/common/dto/pagination.dto';



@Controller('users')
export class UserManageController {
  constructor(
    private readonly userManageService: UserManageService,
  ) { }

  @Post('corps/register')
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

  @Post('corps/register/owner')
  async registerBy(
    @Body() registerDto: registerDto, privateKey: string,
  ) {
    await this.userManageService.createSysOwner(registerDto, privateKey);
    return {
      message: 'Register successful',
    };
  }

  @Post('corps/:userId')
  async delUserByPublicId(
    @Param('userId') id: string,
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

  @Get('getListUsers')
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
 
  @Patch(':publicId/update')
  async updateUserByPublicId(
    @Req() { authUser }: Request,
    @Param('publicId') id: string,
    @Body() updateData: updateUserDto,) {
    if (!authUser) {
      throw new Error('No auth user found');
    }
    
    await this.userManageService.updateUserByPublicId(updateData, authUser.publicId, id);
    return {
      message: 'Update user successful',
    };
  }

  @Get(':id')
  async getUserById(
    @Param('id') id: string,
  ) {
     const user = await this.userManageService.getUserById(id);
      return {
        message: 'Get user successful',
        resultData: user,
      };
  } 
  
  @Patch('corps/:userId/resetPassword')
  async resetPassword(
    @Req() { authUser }: Request,
    @Param('userId') userId: string,
    @Body('painTextPassword') newPainTextPassword: string,
  ) {
    if (!authUser) {
      throw new Error('No auth user found');
    }
    await this.userManageService.resetPassword(
      userId,
      newPainTextPassword,
      authUser
    );
    return {
      message: 'Reset password successful',
    };
  }
}