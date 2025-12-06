import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { MenuModule } from "./menus/menus.module";
import { UserManageModule } from "./user-management/user-manage.module";

@Module({
  imports: [AuthModule, MenuModule, UserManageModule],
})
export class RouteModule { }