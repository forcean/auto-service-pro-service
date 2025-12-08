import { Injectable, Inject } from '@nestjs/common';
import { UsersRepository } from 'src/repository/users/users.repository';
import { registerDto } from './user-manage.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { PoliciesRepository } from 'src/repository/permissions/policies.repository';
import { getUserQueryParamsDto } from './user-manage.dto';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { getPagination } from 'src/common/utils/pagination.util';

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

      if (decodedToken.role == 'ADM' || decodedToken.role == 'SO') {
        const createUser = await this.usersRepository.createUser(registerDto, hashedPassword, decodedToken.publicId, getPermissions);
        if (!createUser) {
          throw new Error('Failed to create user');
        }
      } else {
        throw new Error('Only system owner or admin can create user');
      }

    } catch (error) {
      throw new Error(`Register failed: ${error.message}`);
    }
  }

  async createSysOwner(registerDto: registerDto, privateKey: string) {
    try {
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new Error('User already exists');
      }

      if (privateKey !== 'AUTOSERVICE_SYS_OWNER_CREATE_KEY_10112024') {
        throw new Error('Invalid private key for sys owner creation');
      }

      const getPermissions = await this.policiesRepository.getPermissionsByRole(registerDto.role);
      if (!getPermissions?.length) {
        throw new Error('Permisson does not exist on role in policies');
      }

      const hashedPassword = await bcrypt.hash(registerDto.painTextPassword, 10);
      const createUserSysOwner = await this.usersRepository.createUserSysOwner(registerDto, hashedPassword, getPermissions);
      if (!createUserSysOwner) {
        throw new Error('Failed to create user');
      }

    } catch (error) {
      throw new Error(`Create system owner failed: ${error.message}`);
    }
  }

  async delUserByPublicId(publicId: string, role: string) {
    try {
      if (role !== 'ADM') {
        throw new Error('Only system owner or admin can delete user');
      }

      const isUserExist = await this.usersRepository.getUserByPublicId(publicId);
      if (!isUserExist) {
        throw new Error('User does not exist');
      }

      const deleteUser = await this.usersRepository.delUserByPublicId(publicId);
      if (!deleteUser) {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      throw new Error(`Delete user failed: ${error.message}`);
    }
  }

  async getUserswithPagination(role: string, param: getUserQueryParamsDto, pagination: PaginationQuery) {
    try {
      if (role !== 'ADM' && role !== 'MNG') {
        throw new Error('Only admin or manager can get user list');
      }

      const { page, limit, skip } = getPagination(pagination);

      return await this.usersRepository.getUsersWithPaginated(param.managerId, { page, limit, skip });
    } catch (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }
  }
}