import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { SkuCountersEntity } from "./sku-counters.schema";
import { Model } from "mongoose";

@Injectable()
export class SkuCountersRepository {
  constructor(
    @InjectModel(SkuCountersEntity.name, 'autoservice') private readonly skuCountersEntity: Model<SkuCountersEntity>,
  ) { }

  async getNextSequence(key: string) {
    const counter = await this.skuCountersEntity.findOneAndUpdate(
      { sku: key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  }
}