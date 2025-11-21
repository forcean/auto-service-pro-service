import 'express';
import { CookieParseOptions } from 'cookie-parser';
import { AuthUser } from './user.type'
declare module 'express' {
  interface Request {
    cookies: Record<string, string>;
    signedCookies: Record<string, string>;
    authUser?: AuthUser;
  }
}
