import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuthUser } from 'src/types/user.type';
import { DailyClosingDocument, DailyClosingEntity } from './daily-closing.schema';

export type DailyClosingPayload = {
  businessDate: string;
  openingCash: number;
  cashPayments: number;
  cashRefunds: number;
  expectedCash: number;
  declaredCash: number;
  variance: number;
  unclassifiedRefunds: number;
  note?: string;
};

@Injectable()
export class DailyClosingRepository {
  constructor(
    @InjectModel(DailyClosingEntity.name, 'autoservice')
    private readonly model: Model<DailyClosingDocument>,
  ) {}

  findByBusinessDate(businessDate: string) {
    return this.model.findOne({ businessDate }).lean();
  }

  async create(payload: DailyClosingPayload, user: AuthUser) {
    const closing = await this.model.create({
      ...payload,
      closedBy: user.publicId,
      closedAt: new Date(),
    });
    return closing.toObject();
  }
}
