import { InjectModel } from '@nestjs/mongoose';
import { MenuDocument, MenuEntity } from './menus.schema';
import { Model } from 'mongoose';

export class MenuRepository {
  constructor(
    @InjectModel(MenuEntity.name, 'autoservice')
    private readonly menuModel: Model<MenuDocument>,
  ) {}

  async getMenusByPermissions(permissions: string[]) {
    return await this.menuModel
      .find({
        key: { $in: permissions },
        activeFlag: true,
      })
      .sort({ seq: 1 })
  }
}
