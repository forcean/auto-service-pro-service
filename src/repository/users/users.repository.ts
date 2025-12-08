import { Injectable, Inject } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { registerDto, getUserQueryParamsDto } from '../../routes/user-management/user-manage.dto';
import { UsersEntity } from './users.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { Filter } from 'typeorm';

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

  async delUserByPublicId(userId: string): Promise<boolean> {
    const delUser = await this.usersEntity.deleteOne({
      publicId: userId
    });
    return delUser.deletedCount > 0;
  }

  async getUsersWithPaginated(managerId: string | undefined, pagination: { page: number; limit: number; skip: number }) {
    const { page, limit, skip } = pagination;
    const params: FilterQuery<UsersEntity> = {};
    if (managerId) {
      params.managerId = { $regex: managerId };
    }

    const users = await this.usersEntity.find(params)

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

}
