import { Module } from '@nestjs/common';
import { AuthMiddleware } from './middleware/auth.middleware';


@Module({
  imports: [AuthMiddleware,]
})
export class CoreModule {}