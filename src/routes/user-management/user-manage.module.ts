import { Module } from "@nestjs/common";
import { RepositoryModule } from "src/repository/repository.module";
import { UserManageController } from "./user-manage.controller";
import { UserManageService } from "./user-manage.service";


@Module({
  imports: [RepositoryModule],
  controllers: [UserManageController],
  providers: [UserManageService],
})
export class UserManageModule { }