import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomersVehicleEntity } from './customers-vehicle.schema';
import { FilterQuery, Model } from 'mongoose';
import {
  customerVehicleDto,
  getVehiclesWithPaginationDto,
  updateCustomerVehicleDto,
} from 'src/routes/vehicles-management/dtos/vehicles.dto';
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
    province: string,
  ): Promise<ICustomerVehicleRecord | null> {
    return this.CustomersVehicleEntity.findOne({
      licensePlate: plate,
      province: province,
    });
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
    province: string,
    dto: updateCustomerVehicleDto,
    publicId: string,
  ): Promise<ICustomerVehicleRecord | null> {
    return this.CustomersVehicleEntity.findOneAndUpdate(
      { licensePlate: licensePlate, province: province },
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
    province: string,
  ): Promise<boolean> {
    const result = await this.CustomersVehicleEntity.deleteOne({
      licensePlate,
      province,
    });
    return result.deletedCount > 0;
  }

  async findAllWithPaginated(
    pagination: { page: number; limit: number; skip: number },
    query: getVehiclesWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;

    const filter: FilterQuery<CustomersVehicleEntity> = { }

    if (query.licensePlate) {
      filter.licensePlate = query.licensePlate;
    }

    if (query.province) {
      filter.province = query.province.toUpperCase();
    }

    if (query.status) {
      filter.status = query.status.toUpperCase();
    }

    if (query.model) {
      filter.model = query.model;
    }

    if (query.brand) {
      filter.brand = query.brand;
    }

    const [data, total] = await Promise.all([
      this.CustomersVehicleEntity.find(filter)
        .sort(sortBy ?? 'registrationDt.desc')
        .skip(skip)
        .limit(limit)
        .lean(),
      this.CustomersVehicleEntity.countDocuments(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}
