import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RouteModule } from './routes/route.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEntity } from './repository/users/users.schema';
import { RepositoryModule } from './repository/repository.module';
import { AuthMiddleware } from './core/middleware/auth.middleware';
import { CoreModule } from './core/core.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './common/permission/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    //มาแก้เรื่องช่องโหว่ของการเชื่อมต่อฐานข้อมูล กับเรื่องการวาง module
    MongooseModule.forRoot(process.env.MONGO_URI!, { connectionName: 'autoservice' }),
    RouteModule,
    RepositoryModule,
    // CoreModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('*');
  }
}

