import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { VehiclesRepository } from 'src/repository/vehicles/vehicles.repository';
import { VehicleBrandsRepository } from 'src/repository/vehicle-brands/vehicle-brands.repository';
import { VehicleModelsRepository } from 'src/repository/vehicle-models/vehicle-models.repository';
import { vehiclesDto } from './vehicles.dto';
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

      const existingVehicle = await this.vehiclesRepository.getVehicles(data.brandCode, data.modelCode, data.generation);

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

  async getVehicleBrands(isActive: boolean) {
    try {
      const getVehiclesBrand =
        await this.vehicleBrandsRepository.getVehicleBrands(isActive);
      if (!getVehiclesBrand) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      return {
        vehicleBrands: getVehiclesBrand.map((data) => ({
          name: data.brand,
          code: data.brandCode,
        })),
      };
    } catch (error) {
      console.error(
        `Error getting product vehicles by brand: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicleModelsByBrand(brandCode: string, isActive: boolean) {
    try {
      const getVehicleModels =
        await this.vehicleModelsRepository.getModelsByBrand(
          brandCode,
          isActive,
        );
      if (!getVehicleModels) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      return {
        vehicleModels: getVehicleModels.map((data) => ({
          model: data.model,
          modelCode: data.modelCode,
          generation: data.generation,
        })),
      };
    } catch (error) {
      console.error(
        `Error getting product vehicles by brand: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicles(
    brand: string,
    model: string,
    generation: string,
    isActive?: boolean,
  ) {
    try {
      const getVehicles = await this.vehiclesRepository.getVehicles(
        brand,
        model,
        generation,
        isActive,
      );

      if (!getVehicles) {
        throw new BusinessException('4042', 'No product vehicles found');
      }
      return {
        vehicles: {
          id: getVehicles._id,
          brand: getVehicles.brand,
          brandCode: getVehicles.brandCode,
          model: getVehicles.model,
          modelCode: getVehicles.modelCode,
          generation: getVehicles.generation,
          platform: getVehicles.platform,
          yearFrom: getVehicles.yearFrom,
          yearTo: getVehicles.yearTo,
          engines: getVehicles.engines,
          isActive: getVehicles.isActive,
        }
      };
    } catch (error) {
      console.error(
        `Error getting product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
