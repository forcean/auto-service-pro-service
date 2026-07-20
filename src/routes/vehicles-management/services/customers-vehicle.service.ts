import { Inject, Injectable } from '@nestjs/common';
import {
  customerVehicleDto,
  updateCustomerVehicleDto,
} from '../dtos/vehicles.dto';
import { AuthUser } from 'src/types/user.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { CustomersVehicleRepository } from 'src/repository/customers-vehicle/customers-vehicle.repository';
import { ICustomerVehicle } from '../interfaces/vehicles.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { PaginationQuery } from 'src/common/dto/pagination.dto';

@Injectable()
export class CustomersVehicleService {
  constructor(
    @Inject(CustomersVehicleRepository)
    private readonly customersVehicleRepository: CustomersVehicleRepository,
  ) {}
  async createCustomersVehicle(dto: customerVehicleDto, user: AuthUser) {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          dto.licensePlate,
        );

      if (existingVehicle) {
        throw new BusinessException('4090', 'This vehicle already exists');
      }

      const result =
        await this.customersVehicleRepository.createCustomerVehicle(
          dto,
          user.publicId,
        );

      if (!result) {
        throw new BusinessException('4011', 'Failed to create vehicle');
      }
    } catch (error) {
      console.error(
        `Error creating product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getCustomerVehicleByLicensePlate(
    licensePlate: string,
  ): Promise<ICustomerVehicle> {
    try {
      const getVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
        );

      if (!getVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      return getVehicle;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async updateCustomerVehicleByLicensePlate(
    user: AuthUser,
    dto: updateCustomerVehicleDto,
    licensePlate: string,
  ): Promise<ICustomerVehicle | null> {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
        );

      if (!existingVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      const updatedVehicle =
        await this.customersVehicleRepository.updateCustomerVehicleByLicensePlate(
          licensePlate,
          dto,
          user.publicId,
        );

      if (!updatedVehicle) {
        throw new BusinessException('4011', 'Failed to update vehicle');
      }

      return updatedVehicle;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteCustomerVehicleByLicensePlate(
    user: AuthUser,
    licensePlate: string,
  ): Promise<void> {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
        );

      if (!existingVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      const deletedVehicle =
        await this.customersVehicleRepository.deleteCustomerVehicleByLicensePlate(
          licensePlate,
        );

      if (!deletedVehicle) {
        throw new BusinessException('4011', 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
 
  async getVehiclesWithPagination( pagination: PaginationQuery, sortBy: SortCriterial) {
    try {
      const { page, limit, skip } = getPagination(pagination);

      const result = await this.customersVehicleRepository.findAllWithPaginated({ page, limit, skip }, sortBy); 

      return result;
      
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private userRoleValidation(role: string) {
    if (role !== 'SO' && role !== 'ADM') {
      throw new BusinessException(
        '4030',
        'Only system owner or admin can use this feature!',
      );
    }
  }
}
