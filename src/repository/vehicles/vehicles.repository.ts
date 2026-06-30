import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { VehiclesEntity } from "./vehicles.schema";
import { InjectModel } from "@nestjs/mongoose";
import { vehiclesDto } from 'src/routes/vehicles-management/vehicles.dto';

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectModel(VehiclesEntity.name, 'autoservice') private readonly vehiclesEntity: Model<VehiclesEntity>,
  ) { }

  async createVehicle(data: vehiclesDto){
    const query: FilterQuery<VehiclesEntity> = {
      ...data,
      isActive: true
    }
    return await this.vehiclesEntity.create(query); 
  }

  async getVehicles(brand: string, model: string, generation: string, isActive?: boolean){
    const query: FilterQuery<VehiclesEntity> = {
      brandCode: brand,
      modelCode: model,
      generation: generation
    };
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.vehiclesEntity.findOne(query);
  }

  async getVehicleById(vehicleId: string) {
    const query: FilterQuery<VehiclesEntity> = { _id: vehicleId };
    return await this.vehiclesEntity.findOne(query);
  }
}