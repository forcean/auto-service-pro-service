import { Module } from '@nestjs/common';

import { RepositoryModule } from 'src/repository/repository.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({
  imports: [RepositoryModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppointmentModule {}
