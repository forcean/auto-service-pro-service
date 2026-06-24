import { Module } from "@nestjs/common";
import { RepositoryModule } from "src/repository/repository.module";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { StockManagementModule } from "../stock-management/stock-management.module";

@Module({
  imports: [RepositoryModule,StockManagementModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule { }