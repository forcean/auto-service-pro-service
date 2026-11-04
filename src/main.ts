import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import 'dotenv/config';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { AppValidationPipe } from './common/pipes/app-validation.pipe';
import { json, urlencoded } from 'express';

async function bootstrap() {
  console.log('Environment Variables:',process.env.TEST_KEY);
  // Vehicle documents are transmitted as a data URL. The 8 MB parser limit
  // safely covers the 5 MB file limit after Base64 overhead.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));
  app.useGlobalPipes(new AppValidationPipe());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
