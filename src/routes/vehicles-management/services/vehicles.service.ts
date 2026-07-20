import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { VehiclesRepository } from 'src/repository/vehicles/vehicles.repository';
import { VehicleBrandsRepository } from 'src/repository/vehicle-brands/vehicle-brands.repository';
import { VehicleModelsRepository } from 'src/repository/vehicle-models/vehicle-models.repository';
import { getVehiclesDto, getVehiclesWithPaginationDto, vehiclesDto } from '../dtos/vehicles.dto';
import { AuthUser } from 'src/types/user.type';

@Injectable()
export class VehiclesService {
  constructor(
    @Inject(VehiclesRepository)
    private readonly vehiclesRepository: VehiclesRepository,
    @Inject(VehicleBrandsRepository)
    private readonly vehicleBrandsRepository: VehicleBrandsRepository,
    @Inject(VehicleModelsRepository)
    private readonly vehicleModelsRepository: VehicleModelsRepository,
  ) {}

  async createVehicle(data: vehiclesDto, user: AuthUser) {
    try {
      if (user.role !== 'ADM' && user.role !== 'SO') {
        throw new BusinessException(
          '4030',
          'Only system owner or admin can delete product',
        );
      }

      const existingVehicle = await this.vehiclesRepository.getVehicles(
        data.brandCode,
        data.modelCode,
        data.generation,
      );

      if (existingVehicle) {
        throw new BusinessException('4091', 'Product already exists');
      }

      const result = this.vehiclesRepository.createVehicle(data);

      if (!result) {
        throw new BusinessException('4040', 'Failed to create vehicle');
      }
    } catch (error) {
      console.error(
        `Error creating product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicleDetail(query: getVehiclesDto) {
    try {
      const { brandCode, modelCode, generation, isActive } = query;
      if (brandCode === 'brands') {
        const result =
          await this.vehicleBrandsRepository.getVehicleBrands(isActive);
        if (!result) {
          throw new BusinessException('4042', 'No vehicle brands found');
        }

        return result;
      } else if (brandCode && !modelCode && !generation) {
        const result = await this.vehicleModelsRepository.getModelsByBrand(
          brandCode,
          isActive,
        );
        if (!result) {
          throw new BusinessException('4042', 'No vehicle models found');
        }

        return result;
      } else if (brandCode && modelCode && generation) {
        const result = await this.vehiclesRepository.getVehicles(
          brandCode,
          modelCode,
          generation,
          isActive,
        );
        if (!result) {
          throw new BusinessException('4042', 'No vehicles found');
        }

        return result;
      }
    } catch (error) {
      console.error(
        `Error getting product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
