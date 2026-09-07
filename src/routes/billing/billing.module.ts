import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/repository/repository.module';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WorkOrderModule } from '../work-order/work-order.module';
import { QuotationModule } from '../quotation/quotation.module';
import { TaskModule } from '../task/task.module';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [RepositoryModule, WorkOrderModule, QuotationModule, TaskModule],
  providers: [BillingService, DocumentNoService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
