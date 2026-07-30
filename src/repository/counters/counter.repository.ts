import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CounterEntity, CounterDocument } from './counter.schema';

@Injectable()
export class CounterRepository {
  constructor(
    @InjectModel(CounterEntity.name, 'autoservice')
    private readonly model: Model<CounterDocument>,
  ) {}

  async getNextSequence(key: string): Promise<number> {
    const counter = await this.model.findOneAndUpdate(
      {
        _id: key,
      },
      {
        $inc: {
          seq: 1,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    return counter.seq;
  }
}
