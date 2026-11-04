import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/repository/repository.module';
import { QuotationPresetController } from './quotation-preset.controller';
import { QuotationPresetService } from './quotation-preset.service';

@Module({
  imports: [RepositoryModule],
  controllers: [QuotationPresetController],
  providers: [QuotationPresetService],
})
export class QuotationPresetModule {}
