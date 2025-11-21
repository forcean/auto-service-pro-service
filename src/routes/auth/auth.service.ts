import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto, registerDto } from './auth.dto';
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

  async register(registerDto: registerDto, token: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT secret not defined');
      }

      const decodedToken = jwt.verify(token, secret) as jwt.JwtPayload;
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(registerDto.painTextPassword, 10);

      const getPermissions = await this.policiesRepository.getPermissionsByRole(registerDto.role);
      if (!getPermissions?.length) {
        throw new Error('Permisson does not exist on role in policies');
      }

      const createUser = await this.usersRepository.createUser(registerDto, hashedPassword, decodedToken.publicId, getPermissions);
      if (!createUser) {
        throw new Error('Failed to create user');
      }

    } catch (error) {
      throw new Error(`Register failed: ${error.message}`);
    }
  }

  //เช็ค logic กับชื่อ function ตั้งใหม่ให้ดี
  async createSysOwner(registerDto: registerDto, privateKey: string) {
    try {
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new Error('User already exists');
      }

      if (privateKey !== 'AUTOSERVICE_SYS_OWNER_CREATE_KEY_10112024') {
        throw new Error('Invalid private key for sys owner creation');
      }

      const hashedPassword = await bcrypt.hash(registerDto.painTextPassword, 10);
      const createUserSysOwner = await this.usersRepository.createUserSysOwner(registerDto, hashedPassword);
      if (!createUserSysOwner) {
        throw new Error('Failed to create user');
      }

    } catch (error) {
      throw new Error(`Register failed: ${error.message}`);
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