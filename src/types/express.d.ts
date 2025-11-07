import 'express';
import { CookieParseOptions } from 'cookie-parser';

declare module 'express' {
  interface Request {
    cookies: Record<string, string>;
    signedCookies: Record<string, string>;
  }
}
