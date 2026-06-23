import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/repository/repository.module';
import { StockManagementController } from './stock-management.controller';
import { StockManagementService } from './stock-management.service';

@Module({
  imports: [RepositoryModule],
  controllers: [StockManagementController],
  providers: [StockManagementService],
})
export class StockManagementModule {}
