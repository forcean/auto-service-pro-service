import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { VehicleBrandsEntity } from "./vehicle-brands.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class VehicleBrandsRepository {
  constructor(
    @InjectModel(VehicleBrandsEntity.name, 'autoservice') private readonly vehicleBrandsEntity: Model<VehicleBrandsEntity>,
  ) { }

  async getVehicleBrands(isActive?: boolean) {
    const query: FilterQuery<VehicleBrandsEntity> = {}
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return await this.vehicleBrandsEntity.find(query);
  }
}