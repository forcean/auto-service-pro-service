import { Inject, Injectable } from '@nestjs/common';
import { MenuRepository } from 'src/repository/menus/menus.repository';
import { AuthUser } from 'src/types/user.type';

@Injectable()
export class MenuService {
  constructor(
    @Inject(MenuRepository) private readonly menuRepository: MenuRepository,
  ) { }

  async getMenu(authUser: AuthUser) {
    const menus = await this.menuRepository.getMenusByPermissions(authUser.permissions);
    return {
      role: authUser.role,
      menus: menus.map(menu => ({
        seq: menu.seq,
        key: menu.key,
        displayName: menu.displayName,
        icon: menu.icon,
        endpoint: menu.endpoint,
        activeFlag: menu.activeFlag,
      }))
    };
  }
}