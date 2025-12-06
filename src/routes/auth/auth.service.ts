import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './auth.dto';
import { UsersRepository } from 'src/repository/users/users.repository';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { refreshTokenDto } from './token.dto';
import { TokenRepository } from 'src/repository/token/token.repository';
import { PoliciesRepository } from 'src/repository/permissions/policies.repository';

@Injectable()
export class AuthService {
  private readonly tokenExpire: number = 3600;
  private readonly refreshTokenExpire: number = 604800;

  constructor(
    private configService: ConfigService,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(TokenRepository) private readonly tokenRepository: TokenRepository,
    @Inject(PoliciesRepository) private readonly policiesRepository: PoliciesRepository,
  ) { }

  async loginByPublicId(loginDto: LoginDto) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

      const getUser = await this.usersRepository.getUserByPublicId(loginDto.publicId);

      if (!getUser) {
        throw new Error('User not found');
      }

      const checkPassword = await bcrypt.compare(loginDto.painTextPassword, getUser.credentialId);
      // const checkPassword = loginDto.painTextPassword === getUser.credentialId;
      if (!checkPassword) {
        throw new Error('Invalid password');
      }

      if (!secret || !refreshSecret) {
        throw new Error('JWT secrets are not defined');
      }

      const accessToken = jwt.sign({ publicId: getUser.publicId, role: getUser.role }, secret, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ publicId: getUser.publicId }, refreshSecret, { expiresIn: '7d' });
      const accessTokenExpiresDt = Date.now() + this.tokenExpire * 1000;
      const refreshTokenExpiresDt = Date.now() + this.refreshTokenExpire * 1000;

      const insertToken = await this.tokenRepository.insertToken({
        publicId: getUser.publicId,
        accessToken: accessToken,
        accessTokenExpiresDt: new Date(accessTokenExpiresDt),
        loginDt: new Date(),
        refreshToken: refreshToken,
        refreshTokenExpiresDt: new Date(refreshTokenExpiresDt),
        refreshFlag: true,
      })

      if (!insertToken) {
        throw new Error('Failed to insert token');
      }

      return {
        accessToken,
        refreshToken,
        accessTokenExpiresDt: new Date(accessTokenExpiresDt).toISOString(),
        refreshTokenExpiresDt: new Date(refreshTokenExpiresDt).toISOString()
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async createNewAccessToken(refreshTokenDto: refreshTokenDto) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT secret not defined');
      }

      const decodedToken = jwt.verify(refreshTokenDto.accessToken, secret) as jwt.JwtPayload;
      const getToken = await this.tokenRepository.getToken(refreshTokenDto, decodedToken.publicId);

      if (!getToken) {
        throw new Error('Token not found');
      }

      const newAccessToken = jwt.sign({ publicId: decodedToken.publicId, role: decodedToken.role }, secret, { expiresIn: '1h' });
      const newAccessTokenExpiresDt = Date.now() + this.tokenExpire * 1000;
      const insertToken = await this.tokenRepository.insertToken({
        publicId: decodedToken.publicId,
        accessToken: newAccessToken,
        accessTokenExpiresDt: new Date(newAccessTokenExpiresDt),
        loginDt: new Date(),
        refreshToken: refreshTokenDto.refreshToken,
        refreshTokenExpiresDt: getToken.refreshTokenExpiresDt,
        refreshFlag: true,
      })

      if (insertToken) {
        await this.tokenRepository.deleteOldToken(getToken.publicId, getToken.accessToken, getToken.refreshToken);
      } else {
        throw new Error('Failed to insert new access token');
      }

      return {
        accessToken: newAccessToken,
        refreshToken: refreshTokenDto.refreshToken,
        accessTokenExpiresDt: new Date(newAccessTokenExpiresDt).toISOString(),
        refreshTokenExpiresDt: insertToken.refreshTokenExpiresDt
      };

    } catch (error) {
      throw new Error(`Create new refresh token failed: ${error.message}`);
    }
  }

  async revokeAccessToken(token: string) {
    await this.tokenRepository.deleteByToken(token);
  }
}