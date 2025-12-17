// Source - https://stackoverflow.com/a
// Posted by xorbious
// Retrieved 2025-12-16, License - CC BY-SA 4.0

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface BaseResponse<T> {
  resultCode: number;
  developerMessage: string;
  resultData: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, BaseResponse<T>>
{
  constructor(private reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponse<T>> {
    return next.handle().pipe(
      map((resultData) => {
        const resultCode = this.reflector.get<number>(
          'response_code',
          context.getHandler(),
        ) ?? 2000;

        const developerMessage = 
          this.reflector.get<string>(
            'response_message',
            context.getHandler(),
          ) ?? 'success';
        
        return {
          resultCode,
          resultSatatus: 'Success',
          developerMessage,
          resultData,
        };
      }),
    );
  }
}
