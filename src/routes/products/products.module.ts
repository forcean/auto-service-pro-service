import { Module } from "@nestjs/common";
import { RepositoryModule } from "src/repository/repository.module";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";

@Module({
  imports: [RepositoryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule { }