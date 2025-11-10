import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto, registerDto } from './login.dto';
import { UsersRepository } from 'src/repository/users/users.repository';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { FilterQuery } from 'mongoose';
import { UsersEntity } from 'src/repository/users/users.schema';
@Injectable()
export class LoginService {
  constructor(
    private configService: ConfigService,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
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

      return { accessToken, refreshToken }
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

      if (decodedToken.role === 'system-owner') {
        const createAdmin = await this.usersRepository.createUserAdmin(registerDto, hashedPassword, decodedToken.publicId);
        if (!createAdmin) {
          throw new Error('Failed to create admin user');
        }
      } else if (decodedToken.role === 'admin') {
        const createUser = await this.usersRepository.createUser(registerDto, hashedPassword, decodedToken.publicId);
        if (!createUser) {
          throw new Error('Failed to create user');
        }
      }
    } catch (error) {
      throw new Error(`Register failed: ${error.message}`);
    }
  }

//เช็ค logic กับชื่อ function ตั้งใหม่ให้ดี
  async createSysOwner(registerDto: registerDto) {
    try {
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new Error('User already exists');
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
}