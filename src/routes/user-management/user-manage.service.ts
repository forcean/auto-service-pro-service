import { Injectable, Inject } from '@nestjs/common';
import { UsersRepository } from 'src/repository/users/users.repository';
import { registerDto } from './user-manage.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { PoliciesRepository } from 'src/repository/permissions/policies.repository';

@Injectable()
export class UserManageService {
  constructor(
    private configService: ConfigService,
    @Inject(PoliciesRepository) private readonly policiesRepository: PoliciesRepository,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
  ) { }

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
}