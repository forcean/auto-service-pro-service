import { Inject, Injectable } from '@nestjs/common';
import { customerVehicleDto } from './vehicles.dto';
import { AuthUser } from 'src/types/user.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { CustomersVehicleRepository } from 'src/repository/customers-vehicle/customers-vehicle.repository';

@Injectable()
export class CustomersVehicleService {
  constructor(
    @Inject(CustomersVehicleRepository)
    private readonly customersVehicleRepository: CustomersVehicleRepository,
  ) {}
  async createCustomersVehicle(dto: customerVehicleDto, user: AuthUser) {
    try {
      if (user.role !== 'SO' && user.role !== 'ADM') {
        throw new BusinessException(
          '4030',
          'Only system owner or admin can delete product',
        );
      }

      const existingVehicle = await this.customersVehicleRepository.getVehicleByLicensePlate(dto.licensePlate);

      if (existingVehicle){
        throw new BusinessException('4091', 'This vehicle already exists');
      }

      const result = await this.customersVehicleRepository.createCustomerVehicle(dto, user.publicId);

      if (!result) {
        throw new BusinessException('4040', 'Failed to create vehicle');
      }
    } catch(error) {
      console.error(
        `Error creating product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
