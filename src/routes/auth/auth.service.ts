import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dtos/auth.dto';
import { UsersRepository } from 'src/repository/users/users.repository';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { refreshTokenDto } from './dtos/token.dto';
import { TokenRepository } from 'src/repository/token/token.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { IAuthTokenResponse } from './interface/token.interface';
import { TOKEN_EXPIRE, TOKEN_REFRESH_EXPIRE, TOKEN_REFRESH_SECRET, TOKEN_SECRET } from './constants/auth.constant';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(TokenRepository) private readonly tokenRepository: TokenRepository,
  ) { }

  async loginByPublicId(loginDto: LoginDto): Promise<IAuthTokenResponse> {
    try {
      const secret = this.configService.get<string>(TOKEN_SECRET);
      const refreshSecret = this.configService.get<string>(TOKEN_REFRESH_SECRET);

      const getUser = await this.usersRepository.getUserByPublicId(loginDto.publicId);

      if (!getUser) {
        throw new BusinessException('4040', 'User not found');
      }

      const checkPassword = await bcrypt.compare(loginDto.painTextPassword, getUser.credentialId);
      if (!checkPassword) {
        throw new BusinessException('4010','Invalid password');
      }

      if (!secret || !refreshSecret) {
        throw new BusinessException('4012', 'JWT secrets are not defined');
      }

      const accessToken = jwt.sign({ publicId: getUser.publicId, role: getUser.role }, secret, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ publicId: getUser.publicId }, refreshSecret, { expiresIn: '7d' });
      const accessTokenExpiresDt = Date.now() + TOKEN_EXPIRE * 1000;
      const refreshTokenExpiresDt = Date.now() + TOKEN_REFRESH_EXPIRE * 1000;

      const insertLastLogin = await this.usersRepository.updateLastLogin(getUser.publicId);
      if (!insertLastLogin) {
        throw new BusinessException('4011', 'Failed to update last login');
      }

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
        throw new BusinessException('4011', 'Failed to insert token');
      }

      return this.toTokenResponse(
        accessToken,
        refreshToken,
        new Date(accessTokenExpiresDt).toISOString(),
        new Date(refreshTokenExpiresDt).toISOString(),
      );
    } catch (error) {
      console.log(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async createNewAccessToken(refreshTokenDto: refreshTokenDto): Promise<IAuthTokenResponse> {
    try {
      const secret = this.configService.get<string>(TOKEN_SECRET);
      if (!secret) {
        throw new BusinessException('4012', 'JWT secret not defined');
      }

      const decodedToken = jwt.verify(refreshTokenDto.accessToken, secret) as jwt.JwtPayload;
      const getToken = await this.tokenRepository.getToken(refreshTokenDto, decodedToken.publicId);

      if (!getToken) {
        throw new BusinessException('4041', 'Token not found');
      }

      const newAccessToken = jwt.sign({ publicId: decodedToken.publicId, role: decodedToken.role }, secret, { expiresIn: '1h' });
      const newAccessTokenExpiresDt = Date.now() + TOKEN_EXPIRE * 1000;
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
        throw new BusinessException('4011', 'Failed to insert new access token');
      }

      return this.toTokenResponse(
        newAccessToken,
        refreshTokenDto.refreshToken,
        new Date(newAccessTokenExpiresDt).toISOString(),
        insertToken.refreshTokenExpiresDt.toISOString(),
      );

    } catch (error) {
      console.log(`Create new refresh token failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async revokeAccessToken(token: string) {
    await this.tokenRepository.deleteByToken(token);
  }

  private toTokenResponse(
    accessToken: string,
    refreshToken: string,
    accessTokenExpiresDt: string,
    refreshTokenExpiresDt: string,
  ): IAuthTokenResponse {
    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresDt: accessTokenExpiresDt,
      refreshTokenExpiresDt: refreshTokenExpiresDt,
    };
  }
}