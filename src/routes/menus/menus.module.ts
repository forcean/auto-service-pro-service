import { Module } from '@nestjs/common';
import { RepositoryModule } from 'src/repository/repository.module';
import { MenuController } from './menus.controller';
import { MenuService } from './menus.service';

@Module({
  imports: [RepositoryModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}