import { Module } from '@nestjs/common';
import { QuotationService } from './services/quotation.service';
import { QuotationController } from './quotation.controller';
import { RepositoryModule } from 'src/repository/repository.module';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { WorkOrderModule } from '../work-order/work-order.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [RepositoryModule,WorkOrderModule,
ProductsModule],
  providers: [QuotationService,DocumentNoService],
  controllers: [QuotationController],
  exports:[QuotationService]
})
export class QuotationModule {}
