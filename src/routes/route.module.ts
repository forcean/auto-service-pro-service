import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menus/menus.module';
import { UserManageModule } from './user-management/user-manage.module';
import { ProductsModule } from './products/products.module';
import { StockManagementService } from './stock-management/stock-management.service';
import { StockManagementController } from './stock-management/stock-management.controller';
import { StockManagementModule } from './stock-management/stock-management.module';
import { VehiclesModule } from './vehicles-management/vehicles.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { QuotationModule } from './quotation/quotation.module';
import { TaskModule } from './task/task.module';
import { PartIssueModule } from './part-issue/part-issue.module';

@Module({
  imports: [
    AuthModule,
    MenuModule,
    UserManageModule,
    ProductsModule,
    StockManagementModule,
    VehiclesModule,
    WorkOrderModule,
    QuotationModule,
    TaskModule,
    PartIssueModule
  ],
  providers: [],
  controllers: [],
})
export class RouteModule {}
