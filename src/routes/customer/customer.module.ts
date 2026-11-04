import { Module } from '@nestjs/common';

import { RepositoryModule } from 'src/repository/repository.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({ imports: [RepositoryModule], controllers: [CustomerController], providers: [CustomerService], exports: [CustomerService] })
export class CustomerModule {}
