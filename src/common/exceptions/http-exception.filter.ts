import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    res.status(status).json({
      resultCode: exceptionResponse.resultCode ?? status,
      resultStatus: 'Error',
      developerMessage:
        exceptionResponse.developerMessage ?? exception.message,
    });
  }
}
