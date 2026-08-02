import { Module } from '@nestjs/common';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './services/work-order.service';
import { RepositoryModule } from 'src/repository/repository.module';
import { DocumentNoService } from 'src/common/services/document-no.service';

@Module({
  imports: [RepositoryModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderService,DocumentNoService],
  exports:[WorkOrderService]
})
export class WorkOrderModule {}
