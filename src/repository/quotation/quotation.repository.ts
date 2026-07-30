import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quotation, QuotationDocument } from './quotation.schema';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import { Type } from 'class-transformer';

@Injectable()
export class QuotationRepository {
  constructor(
    @InjectModel(Quotation.name)
    private readonly model: Model<QuotationDocument>,
  ) {}

  async create(
    payload: Partial<Quotation>,
    user: AuthUser,
    session: ClientSession,
  ) {
    const [doc] = await this.model.create(
      [
        {
          ...payload,
          createBy: user.publicId,
        },
      ],
      {
        session,
      },
    );
    return doc;
  }

  async getQuotationById(id: string) {
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('workOrderId')
      .lean();
  }

  async getByQuotationNo( quotationNo: string){
    return this.model.findOne({
        quotationNo,
        isDeleted: false
    })
  }
}
