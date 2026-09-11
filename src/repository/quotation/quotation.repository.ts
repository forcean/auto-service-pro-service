import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QuotationEntity, QuotationDocument } from './quotation.schema';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from 'src/types/user.type';
import { Type } from 'class-transformer';
import {
  ApproveQuotationDto,
  CreateQuotationDto,
  getQuotationWithPaginationDto,
  UpdateQuotationDto,
} from 'src/routes/quotation/dtos/quotation.dto';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import {
  EApprovalMethod,
  ECustomerDecision,
  EQuotationStatus,
} from 'src/routes/quotation/enums/quotation.enum';
import { ICreateQuotation } from 'src/routes/quotation/interfaces/quotation.interface';

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
          workOrderId: new Types.ObjectId(payload.workOrderId),
          items: payload.items.map((item) => ({
            ...item,
            productId: item.productId
              ? new Types.ObjectId(item.productId)
              : undefined,
          })),
          createdBy: user.publicId,
        },
      ],
      { session },
    );

    return quotation;
  }

  async getQuotationById(id: string) {
    return this.quotationEntity
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate({
        path: 'workOrderId',
        select: 'workOrderNo vehicleId customerId advisorId status',
      })
      .lean();
  }

  async getByQuotationNo(quotationNo: string): Promise<QuotationDocument | null> {
    return this.quotationEntity
      .findOne({
        quotationNo,
        isDeleted: false,
      })
      .populate({
        path: 'workOrderId',
        select: 'workOrderNo vehicleId customerId advisorId status',
      });
  }

  async softDelete(id: string, user: AuthUser) {
    return this.quotationEntity.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        updatedBy: user.publicId,
      },
      {
        new: true,
      },
    );
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    return this.quotationEntity.findByIdAndUpdate(
      id,
      {
        status,
        updatedBy: user.publicId,
      },
      {
        new: true,
      },
    );
  }

  async findAllWithPaginated(
    pagination: { page: number; limit: number; skip: number },
    query: getQuotationWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;

    const filter: FilterQuery<QuotationEntity> = {};

    const [data, total] = await Promise.all([
      this.quotationEntity
        .find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'workOrderId',
          select: 'workOrderNo',
        })
        .lean(),

      this.quotationEntity.countDocuments(filter),
    ]);

    const formattedData = data.map((quotation) => {
      const workOrder = quotation.workOrderId as {
        _id: unknown;
        workOrderNo?: string;
      };

      return {
        ...quotation,
        workOrderId: workOrder?._id?.toString(),
        workOrderNo: workOrder?.workOrderNo,
      };
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: formattedData,
    };
  }

  async rejectQuotation(
    id: string,
    reason: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.quotationEntity.findByIdAndUpdate(
      id,
      {
        status: EQuotationStatus.REJECTED,
        customerRemark: reason,
        updatedBy: user.publicId,
      },
      {
        new: true,
        session,
      },
    );
  }

  async expireQuotation(session?: ClientSession) {
    return this.quotationEntity.updateMany(
      {
        status: EQuotationStatus.PENDING_APPROVAL,
        validUntil: {
          $lt: new Date(),
        },
        isDeleted: false,
      },
      {
        $set: {
          status: EQuotationStatus.EXPIRED,
        },
      },
      {
        session,
      },
    );
  }

  async markOldVersion(
    quotationId: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.quotationEntity.findByIdAndUpdate(
      new Types.ObjectId(quotationId),
      {
        isLatest: false,
        updatedBy: new Types.ObjectId(user.id),
      },
      {
        new: true,
        session,
      },
    );
  }

  async approveQuotation(
    id: string,
    payload: ApproveQuotationDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.quotationEntity
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: EQuotationStatus.APPROVED,
            updatedBy: user.publicId,
          },
          $push: {
            approvalHistory: {
              decision: ECustomerDecision.APPROVED,
              customerName: payload.customerName,
              method: payload.method,
              approvedBy: user.publicId,
              approvedAt: new Date(),
              note: payload.note,
            },
          },
        },
        {
          new: true,
          session,
        },
      )
      .lean();
  }

  async updateQuotation(
    id: string,
    payload: Partial<ICreateQuotation>,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return await this.quotationEntity
      .findByIdAndUpdate(
        id,
        {
          $set: {
            workOrderId: new Types.ObjectId(payload.workOrderId),
            validUntil: payload.validUntil,
            includeVat: payload.includeVat,
            taxPercent: payload.taxPercent,
            partTotal: payload.partTotal,
            laborTotal: payload.laborTotal,
            serviceTotal: payload.serviceTotal,
            discountAmount: payload.discountAmount,
            vatAmount: payload.vatAmount,
            grandTotal: payload.grandTotal,
            customerRemark: payload.customerRemark,
            internalRemark: payload.internalRemark,
            items: payload.items,
            updatedBy: user.publicId,
          },
        },
        {
          new: true,
          session,
        },
      )
      .lean();
  }
}
