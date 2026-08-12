import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { RepositoryModule } from 'src/repository/repository.module';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WorkOrderModule } from '../work-order/work-order.module';

@Module({
  imports: [
    RepositoryModule,
    WorkOrderModule,
  ],
  controllers: [TaskController],
  providers: [
    TaskService,
    DocumentNoService,
  ],
})
export class TaskModule {}
