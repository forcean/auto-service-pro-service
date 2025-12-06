import { Injectable, Inject } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { registerDto } from '../../routes/user-management/user-manage.dto';
import { UsersEntity } from './users.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';

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
}