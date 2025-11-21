import { InjectModel } from "@nestjs/mongoose";
import { MenuEntity } from "./menus.schema";
import { Model } from "mongoose";

export class MenuRepository {
  constructor(
    @InjectModel(MenuEntity.name, 'autoservice') private readonly menuEntity: Model<MenuEntity>,
  ) { }


  async getMenusByPermissions(permissions: string[]) {
    return await this.menuEntity.find({
      key: {$in: permissions},
      activeFlag: true
    });
  }
}