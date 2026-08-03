import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Connection, Types } from 'mongoose';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { QuotationRepository } from 'src/repository/quotation/quotation.repository';
import { WorkOrderService } from 'src/routes/work-order/services/work-order.service';
import { AuthUser } from 'src/types/user.type';
import {
  ApproveQuotationDto,
  CreateQuotationDto,
  CreateQuotationItemDto,
  EQuotationItemType,
  getQuotationWithPaginationDto,
} from '../dtos/quotation.dto';
import { ProductsService } from 'src/routes/products/products.service';
import { IQuotationRecord } from '../interfaces/quotation-record.interface';
import { error } from 'console';
import { InjectConnection } from '@nestjs/mongoose';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';
import { EQuotationStatus } from '../enums/quotation.enum';
import { QuotationMapper } from '../mapper/quotation.mapper';
import { IQuotationItem } from '../interfaces/quotation.interface';
import { mapMongoId } from 'src/common/helper/mongo.helper';

@Injectable()
export class QuotationService {
  constructor(
    @InjectConnection('autoservice')
    private readonly connection: Connection,

    @Inject(QuotationRepository)
    private readonly quotationRepository: QuotationRepository,

    @Inject(WorkOrderService)
    private readonly workOrderService: WorkOrderService,

    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,

    @Inject(ProductsService)
    private readonly productsService: ProductsService,
  ) {}

  async createQuotation(payload: CreateQuotationDto, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      // ดึง Work Order และ สร้างเลขเอกสารแบบ Parallel
      const [, quotationNo] = await Promise.all([
        this.workOrderService.getWorkOrderById(payload.workOrderId),
        this.documentNoService.generate(EDocumentType.QUOTATION),
      ]);
      // เตรียมรายการ
      const quotationData = await this.prepareQuotation(payload);
      // สร้างใบเสนอราคา
      const quotation = await this.quotationRepository.createQuotation(
        {
          quotationNo,
          workOrderId: payload.workOrderId,
          validUntil: payload.validUntil,
          includeVat: quotationData.includeVat,
          taxPercent: quotationData.taxPercent,
          partTotal: quotationData.partTotal,
          laborTotal: quotationData.laborTotal,
          serviceTotal: quotationData.serviceTotal,
          discountAmount: quotationData.quotationDiscount,
          vatAmount: quotationData.vatAmount,
          grandTotal: quotationData.grandTotal,
          customerRemark: payload.customerRemark,
          internalRemark: payload.internalRemark,
          items: quotationData.items,
        },
        user,
        session,
      );

      if (!quotation) {
        throw new BusinessException('5001', 'Failed to create quotation');
      }

      // ผูก Work Order
      await this.workOrderService.updateCurrentQuotation(
        payload.workOrderId,
        quotation._id.toString(),
        user,
        session,
      );

      // อนาคต
      // await reserveStock(...)
      // await createNotification(...)
      // await auditLog(...)

      await session.commitTransaction();

      return quotation;
    } catch (error) {
      await session.abortTransaction();

      console.error(`[QuotationService.createQuotation]`, error);

      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async prepareQuotation(payload: CreateQuotationDto) {
    const items = await this.buildQuotationItems(payload.items);

    let partTotal = 0;
    let laborTotal = 0;
    let serviceTotal = 0;

    for (const item of items) {
      switch (item.itemType) {
        case EQuotationItemType.PART:
          partTotal += item.totalAmount;
          break;

        case EQuotationItemType.LABOR:
          laborTotal += item.totalAmount;
          break;

        case EQuotationItemType.SERVICE:
          serviceTotal += item.totalAmount;
          break;
      }
    }

    const subtotal = partTotal + laborTotal + serviceTotal;
    const includeVat = payload.includeVat ?? true;
    const taxPercent = payload.taxPercent ?? 7;
    const quotationDiscount = payload.discountAmount ?? 0;
    const beforeVat = subtotal - quotationDiscount;
    const vatAmount = includeVat ? (beforeVat * taxPercent) / 100 : 0;
    const grandTotal = beforeVat + vatAmount;
    if (quotationDiscount > subtotal) {
      throw new BusinessException(
        '4001',
        'Quotation discount cannot exceed subtotal',
      );
    }

    return {
      items,
      partTotal,
      laborTotal,
      serviceTotal,
      includeVat,
      taxPercent,
      quotationDiscount,
      vatAmount,
      grandTotal,
    };
  }

  private async buildQuotationItems(
    payloadItems: CreateQuotationItemDto[],
  ): Promise<IQuotationItem[]> {
    const items: IQuotationItem[] = [];

    for (const item of payloadItems) {
      items.push(await this.buildQuotationItem(item));
    }

    return items;
  }

  private async buildQuotationItem(
    item: CreateQuotationItemDto,
  ): Promise<IQuotationItem> {
    // กรณีที่เป็น PART ให้ไป ดึง/Validate ข้อมูลจาก ProductsService
    const productData =
      item.itemType === EQuotationItemType.PART
        ? await this.fetchProductDetails(item.sku)
        : null;

    const unitPrice = productData?.unitPrice ?? item.unitPrice ?? 0;
    const description = productData?.description ?? item.description ?? '';
    const lineDiscount = item.discountAmount ?? 0;
    const grossTotal = unitPrice * item.quantity;

    // Validate ส่วนลดรายรายการ
    if (lineDiscount > grossTotal) {
      throw new BusinessException(
        '4001',
        'Item discount cannot exceed item total',
      );
    }

    return {
      itemType: item.itemType,
      productId: productData?.productId,
      sku: productData?.sku,
      description,
      quantity: item.quantity,
      unitPrice,
      discountAmount: lineDiscount,
      totalAmount: grossTotal - lineDiscount,
      remark: item.remark,
    };
  }

  private async fetchProductDetails(sku?: string) {
    if (!sku) {
      throw new BusinessException('4001', 'Product is required');
    }

    const product = await this.productsService.getProductDetail(sku);
    if (!product) {
      throw new BusinessException('4040', 'Product not found');
    }

    const p = product.product;
    return {
      productId: p.id.toString(),
      sku: p.sku,
      description: p.name,
      unitPrice: Number(p.prices?.retail ?? 0),
    };
  }

  async deleteQuotation(quotationId: string, user: AuthUser) {
    try {
      const quotation = await this.quotationRepository.softDelete(
        quotationId,
        user,
      );
      if (!quotation) {
        throw new BusinessException('5004', 'Failed to delete quotation');
      }
      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async getQuotationByNo(quotationNo: string) {
    try {
      const quotation =
        await this.quotationRepository.getByQuotationNo(quotationNo);

      if (!quotation) {
        throw new BusinessException('4040', 'Quotation not found');
      }
    } catch (error) {
      throw error;
    }
  }

  async getQuotationById(id: string): Promise<IQuotationRecord> {
    try {
      const quotation = await this.quotationRepository.getQuotationById(id);

      if (!quotation) {
        throw new BusinessException('4040', 'Quotation not found');
      }

      return QuotationMapper.toRecord(quotation);
    } catch (error) {
      throw error;
    }
  }

  async updateQuotationStatus(id: string, status: string, user: AuthUser) {
    try {
      // if (status) { เช็คว่าห้าม update status นี้ถ้าเป็น

      // }
      const quotation = await this.quotationRepository.updateStatus(
        id,
        status,
        user,
      );

      if (!quotation) {
        throw new BusinessException(
          '5003',
          'Failed to update quotation status',
        );
      }

      return quotation;
    } catch (error) {
      throw error;
    }
  }

  async getQuotationWithPagination(
    query: getQuotationWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(query);

      const result = await this.quotationRepository.findAllWithPaginated(
        { page, limit, skip },
        query,
        sortBy,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async approveQuotation(
    quotationId: string,
    payload: ApproveQuotationDto,
    user: AuthUser,
  ) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const quotation = await this.getQuotationById(quotationId);

      if (quotation.status !== EQuotationStatus.PENDING_APPROVAL) {
        throw new BusinessException('4001', 'Quotation cannot be approved');
      }

      const result = await this.quotationRepository.approveQuotation(
        quotationId,
        payload,
        user,
        session,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to approve quotation');
      }

      await session.commitTransaction();

      return mapMongoId(result);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createRevision(quotationId: string, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const oldQuotation = await this.getQuotationById(quotationId);

      if (!oldQuotation.isLatest) {
        throw new BusinessException(
          '4001',
          'Only latest quotation can create revision',
        );
      }

      const quotationNo = await this.documentNoService.generate(
        EDocumentType.QUOTATION,
      );

      await this.quotationRepository.markOldVersion(quotationId, user, session);

      const quotation = await this.quotationRepository.createQuotation(
        {
          quotationNo,
          workOrderId: oldQuotation.workOrder.id,
          version: oldQuotation.version + 1,
          isLatest: true,
          partTotal: oldQuotation.partTotal,
          laborTotal: oldQuotation.laborTotal,
          serviceTotal: oldQuotation.serviceTotal,
          grandTotal: oldQuotation.grandTotal,
          includeVat: oldQuotation.includeVat,
          taxPercent: oldQuotation.taxPercent,
          discountAmount: oldQuotation.discountAmount,
          vatAmount: oldQuotation.vatAmount,
          validUntil: oldQuotation.validUntil,
          customerRemark: oldQuotation.customerRemark,
          internalRemark: oldQuotation.internalRemark,
          items: oldQuotation.items,
        },
        user,
        session,
      );

      await session.commitTransaction();

      return quotation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async expireQuotation() {
    return await this.quotationRepository.expireQuotation();
  }

  async rejectQuotation(quotationId: string, reason: string, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      const quotation = await this.getQuotationById(quotationId);

      if (quotation.status !== EQuotationStatus.PENDING_APPROVAL) {
        throw new BusinessException('4001', 'Quotation cannot be rejected');
      }

      const result = await this.quotationRepository.rejectQuotation(
        quotationId,
        reason,
        user,
        session,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to reject quotation');
      }

      await session.commitTransaction();

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
