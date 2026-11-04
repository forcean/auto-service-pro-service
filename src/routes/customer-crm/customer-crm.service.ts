import { Inject, Injectable } from '@nestjs/common';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { CustomerCrmRepository } from 'src/repository/customer-crm/customer-crm.repository';
import { CustomerCrmListQueryDto } from './dtos/customer-crm.dto';

@Injectable()
export class CustomerCrmService {
  constructor(
    @Inject(CustomerCrmRepository)
    private readonly customerCrmRepository: CustomerCrmRepository,
  ) {}

  findCustomers(query: CustomerCrmListQueryDto) {
    return this.customerCrmRepository.findCustomers(query);
  }

  async findCustomerDetail(phoneNumber: string) {
    const detail = await this.customerCrmRepository.findCustomerDetail(phoneNumber);
    if (!detail) {
      throw new BusinessException('4040', 'Customer not found');
    }
    return detail;
  }
}
