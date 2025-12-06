import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MenuService } from './menus.service';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
  ) { }

  @Get()
  async getMenu(
    // @Req() { authUser }: Request,
    @Req() req: Request,
  ) {
    const authUser = req.authUser;
    if (!authUser) {
      throw new Error('No auth user found');
    }
    const menus = await this.menuService.getMenu(authUser.permissions);
    return {
      message: 'Get menus successful',
      resultData: {
        role: authUser.role,
        menus: menus.map(menu => ({
          seq: menu.seq,
          key: menu.key,
          displayName: menu.displayName,
          icon: menu.icon,
          endpoint: menu.endpoint,
          activeFlag: menu.activeFlag
        }))
      }
    };
  }
}
