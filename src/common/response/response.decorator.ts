import { SetMetadata } from '@nestjs/common';

export const ResponseMessage = (message: string) =>
  SetMetadata('response_message', message);

export const ResponseResultCode = (code: string) =>
  SetMetadata('response_result_code', code);
