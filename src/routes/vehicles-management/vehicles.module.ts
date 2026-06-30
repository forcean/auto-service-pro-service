import { Module } from "@nestjs/common";
import { RepositoryModule } from "src/repository/repository.module";
import { VehiclesService } from "./vehicles.service";
import { VehiclesController } from "./vehicles.controller";
import { CustomersVehicleService } from './customers-vehicle.service';

@Module({
  imports: [RepositoryModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, CustomersVehicleService],
})
export class VehiclesModule { }