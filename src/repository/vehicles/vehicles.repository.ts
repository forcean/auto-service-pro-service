import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { VehiclesEntity } from "./vehicles.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectModel(VehiclesEntity.name, 'autoservice') private readonly vehiclesEntity: Model<VehiclesEntity>,
  ) { }

  async getVehicles(isActive?: boolean) {
    const query: FilterQuery<VehiclesEntity> = {}
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.vehiclesEntity.find(query);
  }
}