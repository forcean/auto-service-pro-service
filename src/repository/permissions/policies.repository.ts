import { Injectable } from '@nestjs/common';
import { PoliciesEntity } from './policies.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PoliciesRepository {
  constructor(
    @InjectModel(PoliciesEntity.name, 'autoservice') private readonly policiesEntity: Model<PoliciesEntity>,
  ) { }

  async getPermissionsByRole(role: string) {
    const getPermissions = await this.policiesEntity.findOne({ role: role.toUpperCase() });
    return getPermissions?.permissions;
  }
}