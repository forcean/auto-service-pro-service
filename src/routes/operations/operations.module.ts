import { Module } from '@nestjs/common';

import { RepositoryModule } from 'src/repository/repository.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [RepositoryModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
