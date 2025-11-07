import { Injectable, Inject } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { MongoRepository } from 'typeorm';
import { LoginDto, registerDto } from '../../routes/login/login.dto';
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

  async createUserAdmin(userData: registerDto, hashedPassword: string, publicIdCreator: string): Promise<boolean> {
    try {
      await this.usersEntity.create({
        publicId: userData.publicId,
        credentialId: hashedPassword,
        email: userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
        activeFlag: true,
        role: 'admin',
        createdDt: new Date(),
        createdBy: publicIdCreator,
        parent: null,
      });
      return true;
    } catch (error) {
      console.error('Error created user', error);
      return false;
    }
  }

  async createUser(userData: registerDto, hashedPassword: string, publicIdCreator: string): Promise<boolean> {
    try {
      await this.usersEntity.create({
        publicId: userData.publicId,
        credentialId: hashedPassword,
        email: userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
        activeFlag: true,
        role: userData.role,
        createdDt: new Date(),
        createdBy: publicIdCreator,
        parent: publicIdCreator,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createUserSysOwner(userData: registerDto, hashedPassword: string): Promise<boolean> {
    try {
      await this.usersEntity.create({
        publicId: userData.publicId,
        credentialId: hashedPassword,
        email: userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
        activeFlag: true,
        role: 'system-owner',
        createdDt: new Date(),
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}