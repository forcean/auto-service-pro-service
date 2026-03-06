import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { VehiclesEntity } from "./vehicles.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectModel(VehiclesEntity.name, 'autoservice') private readonly vehiclesEntity: Model<VehiclesEntity>,
  ) { }

  async getVehicles(brand: string, model: string, generation: string, isActive?: boolean) {
    const query: FilterQuery<VehiclesEntity> = {
      brandCode: brand,
      modelCode: model,
      generation: generation
    };
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.vehiclesEntity.find(query);
  }

  async getVehicleById(vehicleId: string) {
    const query: FilterQuery<VehiclesEntity> = { _id: vehicleId };
    return await this.vehiclesEntity.findOne(query);
  }
}