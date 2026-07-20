import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomersVehicleEntity } from './customers-vehicle.schema';
import { Model } from 'mongoose';
import {
  customerVehicleDto,
  updateCustomerVehicleDto,
} from 'src/routes/vehicles-management/dtos/vehicles.dto';
import { AuthUser } from 'src/types/user.type';
import { ICustomerVehicleRecord } from 'src/routes/vehicles-management/interfaces/vehicles-record.interface';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Injectable()
export class CustomersVehicleRepository {
  constructor(
    @InjectModel(CustomersVehicleEntity.name, 'autoservice')
    private readonly CustomersVehicleEntity: Model<CustomersVehicleEntity>,
  ) {}

  async getVehicleByLicensePlate(
    plate: string,
  ): Promise<ICustomerVehicleRecord | null> {
    return this.CustomersVehicleEntity.findOne({ licensePlate: plate });
  }

  async createCustomerVehicle(dto: customerVehicleDto, publicId: string) {
    return this.CustomersVehicleEntity.create({
      ...dto,
      province: dto.province.toUpperCase(),
      status: dto.status.toUpperCase(),
      registrationDt: new Date(),
      createdBy: publicId,
    });
  }

  async updateCustomerVehicleByLicensePlate(
    licensePlate: string,
    dto: updateCustomerVehicleDto,
    publicId: string,
  ): Promise<ICustomerVehicleRecord | null> {
    return this.CustomersVehicleEntity.findOneAndUpdate(
      { licensePlate: licensePlate },
      {
        $set: {
          ...dto,
          province: dto.province?.toUpperCase(),
          status: dto.status?.toUpperCase(),
          updatedBy: publicId,
          updatedDt: new Date(),
        },
      },
      { new: true },
    );
  }

  async deleteCustomerVehicleByLicensePlate(
    licensePlate: string,
  ): Promise<boolean> {
    const result = await this.CustomersVehicleEntity.deleteOne({
      licensePlate,
    });
    return result.deletedCount > 0;
  }

  async findAllWithPaginated(pagination: { page: number; limit: number; skip: number }, sortBy: SortCriterial) {
    const { page, limit, skip } = pagination;
    const [data, total] = await Promise.all([
    this.CustomersVehicleEntity.find().sort(sortBy?? 'registrationDt.desc').skip(skip).limit(limit).lean(),
    this.CustomersVehicleEntity.countDocuments(),
    ])

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}
