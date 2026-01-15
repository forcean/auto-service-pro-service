import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { Get, Body, Post, Req, Param, Query, Patch } from '@nestjs/common';
import type { Request } from 'express';
import { registerDto, getUserQueryParamsDto, updateUserDto } from './user-manage.dto';
import { UserManageService } from './user-manage.service';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';



@Controller('users')
export class UserManageController {
  constructor(
    private readonly userManageService: UserManageService,
  ) { }

  @Post('corps/register')
  @UseGuards(PermissionsGuard)
  @Permissions('create:user')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create user successful')
  async register(
    @Body() registerDto: registerDto,
    @Req() { authUser }: Request,
  ) {

    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.userManageService.register(registerDto, authUser);
    // return {
    //   message: 'Register successful',
    // };
  }

  @Post('corps/register/owner')
  @UseGuards(PermissionsGuard)
  @Permissions('create:owner-user')
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

  @Post('corps/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:user-account')
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
  @UseGuards(PermissionsGuard)
  @Permissions('view:list-users')
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

  @Patch(':id/update')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update user successful')
  async updateUserByUserId(
    @Req() { authUser }: Request,
    @Param('id') id: string,
    @Body() updateData: updateUserDto,) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.userManageService.updateUserByUserId(updateData, authUser.publicId, id);
    // return {
    //   message: 'Update user successful',
    // };
  }

  @Get(':id/detail')
  @UseGuards(PermissionsGuard)
  @Permissions('view:user')
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
  @UseGuards(PermissionsGuard)
  @Permissions('reset:user-password')
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

  @Patch('update/userPermissions')
  @UseGuards(PermissionsGuard)
  @Permissions('update:user-permissions')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update user permissions successful')
  async updateUserPermission(
    @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    await this.userManageService.updateUserPermissions(authUser);
  }

  @Get('permissions')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get user permissions successful')
  async getUserPermissions(
    @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return await this.userManageService.getUserPermissions(authUser);
  }
}