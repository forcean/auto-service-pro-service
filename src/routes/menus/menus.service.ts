import { Injectable } from '@nestjs/common';
import { MenuRepository } from 'src/repository/menus/menus.repository';

@Injectable()
export class MenuService {
  constructor(
    @Injectable(MenuRepository) private readonly menuRepository: MenuRepository,
  ) 
  { }

  async getMenu(permissions: string[]) {
    const menus = await this.menuRepository.getMenusByPermissions(permissions);
    return menus;
  }
}