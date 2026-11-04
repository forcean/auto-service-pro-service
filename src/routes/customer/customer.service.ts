import { Inject, Injectable } from '@nestjs/common';

import { CustomerRepository } from 'src/repository/customer/customer.repository';
import { AuthUser } from 'src/types/user.type';
import { CreateCustomerDto, CustomerListQueryDto, UpdateCustomerDto } from './dtos/customer.dto';

@Injectable()
export class CustomerService {
  constructor(@Inject(CustomerRepository) private readonly customerRepository: CustomerRepository) {}

  list(query: CustomerListQueryDto) { return this.customerRepository.findForVehicle(query); }
  create(dto: CreateCustomerDto, user: AuthUser) { return this.customerRepository.create(dto, user).then((customer) => this.customerRepository.toResponse(customer)); }
  async get(id: string) {
    const customer = await this.customerRepository.findById(id);
    return customer ? this.customerRepository.toResponse(customer) : null;
  }
  update(id: string, dto: UpdateCustomerDto, user: AuthUser) { return this.customerRepository.update(id, dto, user).then((customer) => this.customerRepository.toResponse(customer)); }
}
