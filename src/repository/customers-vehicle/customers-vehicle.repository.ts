import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomersVehicleEntity } from './customers-vehicle.schema';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
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

  async updateStatusById(
    vehicleId: string,
    status: string,
    publicId: string,
    session?: ClientSession,
  ): Promise<ICustomerVehicleRecord | null> {
    return this.CustomersVehicleEntity.findByIdAndUpdate(
      new Types.ObjectId(vehicleId),
      {
        $set: {
          status,
          updatedBy: publicId,
          updatedDt: new Date(),
        },
      },
      { new: true, session },
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

    const filter: FilterQuery<CustomersVehicleEntity> = {};
    const normalizeString = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const keywordValue = normalizeString(query.keyword);
    if (keywordValue) {
      const keyword = {
        $regex: this.escapeRegExp(keywordValue),
        $options: 'i',
      };
      filter.$or = [
        { licensePlate: keyword },
        { firstname: keyword },
        { lastname: keyword },
        { phoneNumber: keyword },
        { 'vehicle.brand': keyword },
        { 'vehicle.model': keyword },
      ];
    }

    const licensePlateValue = normalizeString(query.licensePlate);
    if (licensePlateValue) {
      filter.licensePlate = {
        $regex: this.escapeRegExp(licensePlateValue),
        $options: 'i',
      };
    }

    const provinceValue = normalizeString(query.province);
    if (provinceValue) {
      filter.province = provinceValue.toUpperCase();
    }

    const statusValue = normalizeString(query.status);
    if (statusValue) {
      filter.status = statusValue.toUpperCase();
    }

    const modelValue = normalizeString(query.model);
    if (modelValue) {
      filter['vehicle.modelCode'] = modelValue;
    }

    const brandValue = normalizeString(query.brand);
    if (brandValue) {
      filter['vehicle.brandCode'] = brandValue;
    }

    const sort = this.mapListSort(sortBy);

    const [data, total] = await Promise.all([
      this.CustomersVehicleEntity.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.CustomersVehicleEntity.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async getDashboardSummary() {
    const now = new Date();
    const startOfCurrentMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [summary] = await this.CustomersVehicleEntity.aggregate([
      {
        $facet: {
          vehicles: [{ $count: 'count' }],
          customers: [
            { $match: { phoneNumber: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$phoneNumber' } },
            { $count: 'count' },
          ],
          brands: [
            { $match: { 'vehicle.brand': { $type: 'string', $ne: '' } } },
            {
              $group: {
                _id: { $ifNull: ['$vehicle.brandCode', '$vehicle.brand'] },
              },
            },
            { $count: 'count' },
          ],
          newVehicles: [
            { $match: { registrationDt: { $gte: startOfCurrentMonth } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const count = (key: 'vehicles' | 'customers' | 'brands' | 'newVehicles') =>
      Number(summary?.[key]?.[0]?.count ?? 0);

    return {
      totalVehicles: count('vehicles'),
      totalCustomers: count('customers'),
      totalBrands: count('brands'),
      newVehicles: count('newVehicles'),
    };
  }

  private mapListSort(sortBy: SortCriterial | null): SortCriterial {
    const fieldMap: Record<string, string> = {
      plateNumber: 'licensePlate',
      ownerName: 'firstname',
      brand: 'vehicle.brand',
      model: 'vehicle.model',
      mileage: 'mileage',
      registrationDt: 'registrationDt',
      lastServiceDate: 'registrationDt',
      status: 'status',
    };

    if (!sortBy || !Object.keys(sortBy).length) {
      return { registrationDt: 'desc' };
    }

    const mappedSort = Object.entries(sortBy).reduce<SortCriterial>((result, [field, direction]) => {
      const databaseField = fieldMap[field];
      if (databaseField) result[databaseField] = direction;
      return result;
    }, {}) || { registrationDt: 'desc' };

    return Object.keys(mappedSort).length
      ? mappedSort
      : { registrationDt: 'desc' };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
