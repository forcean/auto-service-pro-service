import { Module } from '@nestjs/common';

import { RepositoryModule } from 'src/repository/repository.module';
import { CustomerCrmController } from './customer-crm.controller';
import { CustomerCrmService } from './customer-crm.service';

@Module({
  imports: [RepositoryModule],
  controllers: [CustomerCrmController],
  providers: [CustomerCrmService],
})
export class CustomerCrmModule {}
