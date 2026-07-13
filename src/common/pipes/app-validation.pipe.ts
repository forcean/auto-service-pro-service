import {
  BadRequestException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.flatMap((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints)
            : [];

          return constraints.map((message) => `${error.property}: ${message}`);
        });

        return new BadRequestException({
          resultCode: 400,
          developerMessage: 'Validation failed',
          data: {
            message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
            messageList: messages,
          },
        });
      },
    });
  }
}