import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { MenuModule } from "./menus/menus.module";

@Module({
  imports: [AuthModule, MenuModule],
})
export class RouteModule { }