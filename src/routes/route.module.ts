import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { MenuModule } from "./menus/menus.module";
import { UserManageModule } from "./user-management/user-manage.module";
import { ProductsModule } from "./products/products.module";
import { StockManagementService } from './stock-management/stock-management.service';
import { StockManagementController } from './stock-management/stock-management.controller';
import { StockManagementModule } from './stock-management/stock-management.module';
import { VehiclesModule } from './vehicles-management/vehicles.module';

@Module({
  imports: [AuthModule, MenuModule, UserManageModule, ProductsModule, StockManagementModule, VehiclesModule],
  providers: [],
  controllers: [],
})
export class RouteModule { }