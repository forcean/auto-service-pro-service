import { Controller, Get, Req, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { MenuService } from './menus.service';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import { ResponseMessage, ResponseResultCode } from 'src/common/response/response.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
  ) { }

  @Get()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode(2000)
  @ResponseMessage('Get menus successful')
  async getMenu(
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException(4013, 'No auth user found');
    }
    return await this.menuService.getMenu(authUser);
    // return {
    //   message: 'Get menus successful',
    //   resultData: {
    //     role: authUser.role,
    //     menus: menus.map(menu => ({
    //       seq: menu.seq,
    //       key: menu.key,
    //       displayName: menu.displayName,
    //       icon: menu.icon,
    //       endpoint: menu.endpoint,
    //       activeFlag: menu.activeFlag
    //     }))
    //   }
    // };
  }
}
