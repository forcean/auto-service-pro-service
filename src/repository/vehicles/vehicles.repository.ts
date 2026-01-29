import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { VehiclesEntity } from "./vehicles.schema";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectModel(VehiclesEntity.name, 'autoservice') private readonly vehiclesEntity: Model<VehiclesEntity>,
  ) { }
}