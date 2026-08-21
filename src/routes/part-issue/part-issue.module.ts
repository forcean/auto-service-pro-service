import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/repository/repository.module';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WorkOrderModule } from '../work-order/work-order.module';
import { ProductsModule } from '../products/products.module';
import { PartIssueService } from './service/part-issue.service';
import { PartIssueController } from './part-issue.controller';
import { StockManagementModule } from '../stock-management/stock-management.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [RepositoryModule,WorkOrderModule,
ProductsModule,StockManagementModule,TaskModule],
  providers: [PartIssueService,DocumentNoService],
  controllers: [PartIssueController],
  exports:[PartIssueService]
})
export class PartIssueModule {}
