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

    const developerMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.developerMessage ??
          (Array.isArray(exceptionResponse?.message)
            ? exceptionResponse.message.join(' | ')
            : exceptionResponse?.message ?? exception.message);

    res.status(status).json({
      resultCode: exceptionResponse?.resultCode ?? status,
      resultStatus: 'Error',
      developerMessage,
      ...(exceptionResponse?.data
        ? { data: exceptionResponse.data }
        : {}),
    });
  }
}
