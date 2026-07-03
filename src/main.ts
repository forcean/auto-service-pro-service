import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import 'dotenv/config';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { AppValidationPipe } from './common/pipes/app-validation.pipe';

async function bootstrap() {
  console.log('Environment Variables:',process.env.TEST_KEY);
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new AppValidationPipe());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
