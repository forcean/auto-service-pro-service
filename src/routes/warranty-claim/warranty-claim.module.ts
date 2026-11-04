import { Module } from '@nestjs/common';

import { DocumentNoService } from 'src/common/services/document-no.service';
import { RepositoryModule } from 'src/repository/repository.module';
import { WorkOrderModule } from 'src/routes/work-order/work-order.module';
import { WarrantyClaimController } from './warranty-claim.controller';
import { WarrantyClaimService } from './warranty-claim.service';

@Module({
  imports: [RepositoryModule, WorkOrderModule],
  controllers: [WarrantyClaimController],
  providers: [WarrantyClaimService, DocumentNoService],
})
export class WarrantyClaimModule {}
