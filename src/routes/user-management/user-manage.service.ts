import { Injectable, Inject } from '@nestjs/common';
import { UsersRepository } from 'src/repository/users/users.repository';
import { registerDto, updateUserDto } from './user-manage.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { PoliciesRepository } from 'src/repository/permissions/policies.repository';
import { getUserQueryParamsDto } from './user-manage.dto';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { AuthUser } from 'src/types/user.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { log } from 'console';

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
        throw new BusinessException('4012', 'JWT secret not defined');
      }

      const decodedToken = jwt.verify(token, secret) as jwt.JwtPayload;
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new BusinessException('4090', 'User already exists');
      }

      const hashedPassword = await bcrypt.hash(registerDto.painTextPassword, 10);

      const getPermissions = await this.policiesRepository.getPermissionsByRole(registerDto.role);
      if (!getPermissions?.length) {
        throw new BusinessException('4031', 'Permisson does not exist on role in policies');
      }

      if (decodedToken.role == 'ADM' || decodedToken.role == 'SO') {
        const createUser = await this.usersRepository.createUser(registerDto, hashedPassword, decodedToken.publicId, getPermissions);
        if (!createUser) {
          throw new BusinessException('4011', 'Failed to create user');
        }
      } else {
        throw new BusinessException('4030', 'Only system owner or admin can create user');
      }

    } catch (error) {
      console.log('Error creating user: ${error.message}');
      throw error;
    }
  }

  async createSysOwner(registerDto: registerDto, privateKey: string) {
    try {
      const isUserExist = await this.usersRepository.getUserByPublicId(registerDto.publicId);
      if (isUserExist) {
        throw new BusinessException('4090', 'User already exists');
      }

      if (privateKey !== 'AUTOSERVICE_SYS_OWNER_CREATE_KEY_10112024') {
        throw new BusinessException('4032', 'Invalid private key for sys owner creation');
      }

      const getPermissions = await this.policiesRepository.getPermissionsByRole(registerDto.role);
      if (!getPermissions?.length) {
        throw new BusinessException('4031', 'Permisson does not exist on role in policies');
      }

      const hashedPassword = await bcrypt.hash(registerDto.painTextPassword, 10);
      const createUserSysOwner = await this.usersRepository.createUserSysOwner(registerDto, hashedPassword, getPermissions);
      if (!createUserSysOwner) {
        throw new BusinessException('4011', 'Failed to create user');
      }

    } catch (error) {
      console.log('Failed to create system owner: ${error.message}');
      throw error;
    }
  }

  async delUserByPublicId(userId: string, role: string) {
    try {
      if (role !== 'ADM' && role !== 'SO') {
        throw new BusinessException('4030', 'Only system owner or admin can delete user');
      }

      const isUserExist = await this.usersRepository.getUserById(userId);
      if (!isUserExist) {
        throw new BusinessException('4040', 'User does not exist');
      }

      const deleteUser = await this.usersRepository.delUserById(userId);
      if (!deleteUser) {
        throw new BusinessException('4011', 'Failed to delete user');
      }
    } catch (error) {
      console.log(`Delete user failed: ${error.message}`);
      throw error;
    }
  }

  async getUserswithPagination(role: string, param: getUserQueryParamsDto, pagination: PaginationQuery) {
    try {
      if (role !== 'SO' && role !== 'ADM' && role !== 'MNG') {
        throw new BusinessException('4030', 'Only admin or manager can get user list');
      }

      const { page, limit, skip } = getPagination(pagination);

      const result = await this.usersRepository.getUsersWithPaginated(param, { page, limit, skip });
      const managerIds = result.data.map(user => user.managerId).filter(id => id !== undefined && id !== null);
      const managerDetails = await this.usersRepository.getUsersByIds(managerIds);
      const managerMap = new Map(
        managerDetails.map(manager => [manager._id.toString(), `${manager.firstname} ${manager.lastname}`])
      )
      const mappedData = result.data.map((user) => ({
        ...user,
        managerName: user.managerId ? managerMap.get(user.managerId.toString()) : null
      }))

      return {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        users: mappedData.map((user) => ({
          id: user._id,
          publicId: user.publicId,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          managerName: user.managerName,
          activeFlag: user.activeFlag,
          lastAccessDt: user.lastAccessDt,
        })),
      };

    } catch (error) {
      console.log(`Get user failed: ${error.message}`);
      throw error;
    }
  }

  async updateUserByPublicId(data: updateUserDto, updateBy: string, publicId: string) {
    try {
      const isUserExist = await this.usersRepository.getUserByPublicId(publicId);
      if (!isUserExist) {
        throw new BusinessException('4040', 'User does not exist');
      }
      //มาเขียนเพิ่มเรื่องเช็คอีเมลว่าที่เปลี่ยนมีซ้ำกับคนอื่นไหมยกเว้นเขียนอันเดิมตัวเอง
      const updateUser = await this.usersRepository.updateUserByPublicId(data, updateBy, publicId);
      if (!updateUser) {
        throw new BusinessException('4011', 'Failed to update user');
      }
    } catch (error) {
      console.log('Error updating user:', error.message);
      throw error;
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await this.usersRepository.getUserById(userId);
      if (!user) {
        throw new BusinessException('4040', 'User does not exist');
      }
      return {
        id: user._id,
        publicId: user.publicId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstname,
        lastName: user.lastname,
        activeFlag: user.activeFlag,
        createdDt: user.createdDt,
        createdBy: user.createdBy,
        lastLogin: user.lastAccessDt,
        role: user.role,
        managerId: user.managerId,
        updatedDt: user.updatedDt,
        updatedBy: user.updatedBy,
      };
    } catch (error) {
      console.log(`Get user failed: ${error.message}`);
      throw error;
    }
  }

  async resetPassword(
    userId: string,
    newPainTextPassword: string,
    authUser: AuthUser,
  ) {
    try {
      if (authUser.role !== 'SO' && authUser.role !== 'ADM') {
        throw new BusinessException('4030', 'Only system owner, admin can reset password');
      }

      const user = await this.usersRepository.getUserById(userId);
      if (!user || user.activeFlag === false) {
        throw new BusinessException('4040', 'User does not exist or inactive');
      } //อาจเพิ่มเช็คเรื่อง Permissiom

      const hashedNewPassword = await bcrypt.hash(newPainTextPassword, 10);
      const resetPassword = await this.usersRepository.resetPassword(hashedNewPassword, authUser.publicId, userId);
      if (!resetPassword) {
        throw new BusinessException('4011', 'Failed to reset password');
      }

    } catch (error) {
      console.log(`Reset password failed: ${error.message}`);
      throw error;
    }
  }
}