import { Controller, UseInterceptors } from '@nestjs/common';
import { Get, Body, Post, Req, Param, Query, Patch } from '@nestjs/common';
import type { Request } from 'express';
import { registerDto, getUserQueryParamsDto, updateUserDto } from './user-manage.dto';
import { UserManageService } from './user-manage.service';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';



@Controller('users')
export class UserManageController {
  constructor(
    private readonly userManageService: UserManageService,
  ) { }

  @Post('corps/register')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create user successful')
  async register(
    @Body() registerDto: registerDto,
    @Req() req: Request,
  ) {
    if (!req.cookies.accessToken) {
      throw new BusinessException('4012', 'No token provided');
    }
    const token = req.cookies?.accessToken;
    await this.userManageService.register(registerDto, token);
    // return {
    //   message: 'Register successful',
    // };
  }

  @Post('corps/register/owner')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create owner user successful')
  async registerBy(
    @Body() registerDto: registerDto, privateKey: string,
  ) {
    await this.userManageService.createSysOwner(registerDto, privateKey);
    // return {
    //   message: 'Register successful',
    // };
  }

  @Post('corps/:userId/delete')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Delete user successful')
  async delUserByPublicId(
    @Param('userId') id: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    await this.userManageService.delUserByPublicId(id, authUser.role);
    // return {
    //   message: 'Delete user successful',
    // };
  }

  @Get('getListUsers')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get list user successful')
  async getUserBymanagerId(
    @Req() { authUser }: Request,
    @Query() pagination: PaginationQuery,
    @Query() param: getUserQueryParamsDto
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return await this.userManageService.getUserswithPagination(authUser.role, param, pagination);
    // return {
    //   message: 'Get users successful',
    //   resultData: getUsers,
    // };
  }

  @Patch(':publicId/update')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update user successful')
  async updateUserByPublicId(
    @Req() { authUser }: Request,
    @Param('publicId') id: string,
    @Body() updateData: updateUserDto,) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.userManageService.updateUserByPublicId(updateData, authUser.publicId, id);
    // return {
    //   message: 'Update user successful',
    // };
  }

  @Get(':id/detail')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get user detail successful')
  async getUserById(
    @Param('id') id: string,
  ) {
    return await this.userManageService.getUserById(id);
    // return {
    //   message: 'Get user successful',
    //   resultData: user,
    // };
  }

  @Patch('corps/:userId/resetPassword')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Reset password successful')
  async resetPassword(
    @Req() { authUser }: Request,
    @Param('userId') userId: string,
    @Body('painTextPassword') newPainTextPassword: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    await this.userManageService.resetPassword(
      userId,
      newPainTextPassword,
      authUser
    );
    // return {
    //   message: 'Reset password successful',
    // };
  }
}