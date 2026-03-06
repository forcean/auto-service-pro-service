import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { VehicleModelsEntity } from "./vehicle-models.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class VehicleModelsRepository {
  constructor(
    @InjectModel(VehicleModelsEntity.name, 'autoservice') private readonly vehicleModelsEntity: Model<VehicleModelsEntity>,
  ) { }

  async getModelsByBrand(brand: string, isActive?: boolean) {
    const query: FilterQuery<VehicleModelsEntity> = { brandCode: brand };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.vehicleModelsEntity.find(query);
  }
}