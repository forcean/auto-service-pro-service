import { Module } from '@nestjs/common';
import { RouteModule } from './routes/route.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEntity } from './repository/users/users.schema';
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    //มาแก้เรื่องช่องโหว่ของการเชื่อมต่อฐานข้อมูล กับเรื่องการวาง module
    MongooseModule.forRoot(process.env.MONGO_URI!, { connectionName: 'autoservice' }),
    RouteModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }

