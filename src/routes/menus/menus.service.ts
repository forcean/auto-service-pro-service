import { Inject, Injectable } from '@nestjs/common';
import { MenuRepository } from 'src/repository/menus/menus.repository';
import { AuthUser } from 'src/types/user.type';
import { IMenuNode, IMenuResponse } from './interfaces/menus.interface';
import { MenuDocument, MenuEntity } from 'src/repository/menus/menus.schema';

@Injectable()
export class MenuService {
  constructor(
    @Inject(MenuRepository) private readonly menuRepository: MenuRepository,
  ) {}

  async getMenu(authUser: AuthUser): Promise<IMenuResponse> {
    const menus = await this.menuRepository.getMenusByPermissions(
      authUser.permissions,
    );

    return {
      role: authUser.role,
      menus: this.buildMenuTree(menus),
    };
  }

  private buildMenuTree(menus: MenuDocument[]): IMenuNode[] {
    const menuMap = new Map<string, IMenuNode>();
    menus.forEach((menu) => {
      menuMap.set(menu._id.toString(), {
        seq: menu.seq,
        key: menu.key,
        displayName: menu.displayName,
        icon: menu.icon,
        endpoint: menu.endpoint,
        activeFlag: menu.activeFlag,
        children: [],
      });
    });
    const roots: IMenuNode[] = [];
    menus.forEach((menu) => {
      const current = menuMap.get(menu._id.toString());

      if (!current) {
        return;
      }

      if (menu.parentId) {
        const parent = menuMap.get(menu.parentId.toString());

        if (parent) {
          parent.children.push(current);
        }
      } else {
        roots.push(current);
      }
    });
    this.sortMenus(roots);

    return roots;
  }

  private sortMenus(items: IMenuNode[]): void {
    items.sort((a, b) => a.seq - b.seq);
    items.forEach((item) => {
      if (item.children.length > 0) {
        this.sortMenus(item.children);
      }
    });
  }
}
