import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QuotationEntity, QuotationDocument } from './quotation.schema';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import { Type } from 'class-transformer';
import { CreateQuotationDto } from 'src/routes/quotation/dtos/quotation.dto';
import { ICreateQuotation } from 'src/routes/quotation/interfaces/quotation-record.interface';

@Injectable()
export class QuotationRepository {
  constructor(
    @InjectModel(QuotationEntity.name, 'autoservice')
    private readonly quotationEntity: Model<QuotationDocument>,
  ) {}

  async createQuotation(
    payload: ICreateQuotation,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [quotation] = await this.quotationEntity.create(
      [
        {
          ...payload,
          createdBy: user.id,
        },
      ],
      {
        session,
      },
    );

    return quotation;
  }

  async getQuotationById(id: string) {
    return this.quotationEntity
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('workOrderId')
      .lean();
  }

  async getByQuotationNo(quotationNo: string) {
    return this.quotationEntity.findOne({
      quotationNo,
      isDeleted: false,
    });
  }

  async findCurrentQuotation(workOrderId: string) {}
}
