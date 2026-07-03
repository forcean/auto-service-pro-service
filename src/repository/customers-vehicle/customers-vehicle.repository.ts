import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomersVehicleEntity } from './customers-vehicle.schema';
import { Model } from 'mongoose';
import { customerVehicleDto } from 'src/routes/vehicles-management/dtos/vehicles.dto';
import { AuthUser } from 'src/types/user.type';

@Injectable()
export class CustomersVehicleRepository {
  constructor(
    @InjectModel(CustomersVehicleEntity.name, 'autoservice')
    private readonly CustomersVehicleEntity: Model<CustomersVehicleEntity>,
  ) {}

  async getVehicleByLicensePlate(plate: string) {
    return this.CustomersVehicleEntity.findOne({ licensePlate: plate });
  }

  async createCustomerVehicle(dto: customerVehicleDto, publicId: string) {
    return this.CustomersVehicleEntity.create({
      ...dto,
      province: dto.province.toUpperCase(),
      registrationDate: new Date,
      createdBy: publicId,
    });
  }
}
