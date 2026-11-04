import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import {
  QuotationPresetDocument,
  QuotationPresetEntity,
} from './quotation-preset.schema';

type QuotationPresetItemInput = {
  productId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

@Injectable()
export class QuotationPresetRepository {
  constructor(
    @InjectModel(QuotationPresetEntity.name, 'autoservice')
    private readonly quotationPresetEntity: Model<QuotationPresetDocument>,
  ) {}

  async findAll(isActive?: boolean) {
    const filter: FilterQuery<QuotationPresetEntity> = {
      isDeleted: { $ne: true },
    };

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    return this.quotationPresetEntity
      .find(filter)
      .sort({ isActive: -1, name: 1 })
      .lean();
  }

  async findById(id: string) {
    return this.quotationPresetEntity
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: { $ne: true },
      })
      .lean();
  }

  async create(
    payload: {
      name: string;
      description?: string;
      items: QuotationPresetItemInput[];
      isActive: boolean;
    },
    user: AuthUser,
  ) {
    const preset = await this.quotationPresetEntity.create({
      ...payload,
      items: this.toItems(payload.items),
      createdBy: user.publicId,
      updatedBy: user.publicId,
      isDeleted: false,
    });

    return preset.toObject();
  }

  async update(
    id: string,
    payload: Partial<{
      name: string;
      description?: string;
      items: QuotationPresetItemInput[];
      isActive: boolean;
    }>,
    user: AuthUser,
  ) {
    const update: Record<string, unknown> = {
      ...payload,
      updatedBy: user.publicId,
    };

    if (payload.items) {
      update['items'] = this.toItems(payload.items);
    }

    return this.quotationPresetEntity
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), isDeleted: { $ne: true } },
        { $set: update },
        { new: true },
      )
      .lean();
  }

  private toItems(items: QuotationPresetItemInput[]) {
    return items.map((item) => ({
      ...item,
      productId: new Types.ObjectId(item.productId),
    }));
  }
}
