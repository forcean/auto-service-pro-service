import { Injectable, Inject, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { AuthUser } from '../../types/user.type';
import { UsersRepository } from 'src/repository/users/users.repository';
import { TokenPayload } from 'src/types/token.type';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
  ) { }
  async use(req: Request, res: Response, next: NextFunction) {
    console.log('AuthMiddleware running...');
    const token = req.cookies?.accessToken;
    console.log('Token:', token);
    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET!) as TokenPayload;
        if (decoded?.publicId) {
          const user = await this.usersRepository.getUserByPublicId(decoded.publicId);
          if (user) {
            req.authUser = user as AuthUser; // <-- สำคัญมาก
          }
        }
      } catch (error) {
        console.error('Invalid token');
      }
    }

    next();
  }
}
