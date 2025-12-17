import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { getUserQueryParamsDto, registerDto, updateUserDto } from '../../routes/user-management/user-manage.dto';
import { UsersEntity } from './users.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Injectable()
export class UsersRepository {

  constructor(
    @InjectModel(UsersEntity.name, 'autoservice') private readonly usersEntity: Model<UsersEntity>,
  ) { }

  async getUserByPublicId(publicId: string) {
    const query: FilterQuery<UsersEntity> = { publicId: publicId };
    return await this.usersEntity.findOne(query);
  }

  // async createUserAdmin(userData: registerDto, hashedPassword: string, publicIdCreator: string, permissions: string[]): Promise<boolean> {
  //   try {
  //     await this.usersEntity.create({
  //       publicId: userData.publicId,
  //       credentialId: hashedPassword,
  //       email: userData.email,
  //       phoneNumber: userData.phoneNumber,
  //       firstname: userData.firstname,
  //       lastname: userData.lastname,
  //       activeFlag: true,
  //       role: 'admin',
  //       permissions: permissions,
  //       createdDt: new Date(),
  //       createdBy: publicIdCreator,
  //       parent: null,
  //     });
  //     return true;
  //   } catch (error) {
  //     console.error('Error created user', error);
  //     return false;
  //   }
  // }

  async createUser(userData: registerDto, hashedPassword: string, publicIdCreator: string, permissions: string[]): Promise<boolean> {
    try {
      await this.usersEntity.create({
        publicId: userData.publicId,
        credentialId: hashedPassword,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        firstname: userData.firstname,
        lastname: userData.lastname,
        activeFlag: true,
        role: userData.role.toUpperCase(),
        permissions: permissions,
        createdDt: new Date(),
        createdBy: publicIdCreator,
        managerId: userData.managerId,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createUserSysOwner(userData: registerDto, hashedPassword: string, permissions: string[]): Promise<boolean> {
    try {
      await this.usersEntity.create({
        publicId: userData.publicId,
        credentialId: hashedPassword,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        firstname: userData.firstname,
        lastname: userData.lastname,
        activeFlag: true,
        role: 'SO',
        permissions: permissions,
        createdDt: new Date(),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async delUserById(userId: string): Promise<boolean> {
    const delUser = await this.usersEntity.deleteOne({
      _id: userId
    });
    return delUser.deletedCount > 0;
  }

  async getUsersWithPaginated(query: getUserQueryParamsDto, pagination: { page: number; limit: number; skip: number }) {
    const { page, limit, skip } = pagination;
    const params: FilterQuery<UsersEntity> = {};
    if (query.managerId) {
      params.managerId = { $regex: query.managerId };
    }

    if (query.role) {
      params.role = query.role;
    }

    const [data, total] = await Promise.all([
      this.usersEntity.find(params).skip(skip).limit(limit).lean(),
      this.usersEntity.countDocuments(params),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async updateUserByPublicId(data: updateUserDto, updateBy: string, publicId: string) {
    const updateResult = await this.usersEntity.updateOne(
      { publicId: publicId },
      {
        $set: {
          ...data,
          updatedBy: updateBy,
          updatedDt: new Date(),
        },
      },
    );
    return updateResult.modifiedCount > 0;
  }

  async getUserById(userId: string) {
    const query: FilterQuery<UsersEntity> = {
      _id: userId
    };
    return await this.usersEntity.findOne(query);
  }

  async resetPassword(password: string, updateBy: string, id: string) {
    const updateResult = await this.usersEntity.updateOne(
      { _id: id },
      {
        $set: {
          credentialId: password,
          updatedBy: updateBy,
          updatedDt: new Date(),
        },
      },
    );
    return updateResult.modifiedCount > 0;
  }

  async updateLastLogin(publicId: string) {
    const updateResult = await this.usersEntity.updateOne(
      { publicId: publicId },
      {
        $set: {
          lastAccessDt: new Date(),
        },
      },
    );
    return updateResult.modifiedCount > 0;
  }

  async getUsersByIds(userIds: string[]) {
    return await this.usersEntity.find({
      _id: { $in: userIds },
    });
  }
}
