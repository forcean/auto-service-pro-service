import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { MenuModule } from "./menus/menus.module";
import { UserManageModule } from "./user-management/user-manage.module";
import { ProductsModule } from "./stock-products/products.module";
import { VehiclesModule } from './vehicles-management/vehicles.module';

@Module({
  imports: [AuthModule, MenuModule, UserManageModule, ProductsModule, VehiclesModule],
})
export class RouteModule { }