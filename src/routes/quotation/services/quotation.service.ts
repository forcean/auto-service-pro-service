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
  CreateQuotationRevisionDto,
  getQuotationWithPaginationDto,
  UpdateQuotationDto,
} from '../dtos/quotation.dto';
import { ProductsService } from 'src/routes/products/products.service';
import { IQuotationRecord } from '../interfaces/quotation-record.interface';
import { InjectConnection } from '@nestjs/mongoose';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';
import { EQuotationItemType, EQuotationStatus } from '../enums/quotation.enum';
import { QuotationMapper } from '../mapper/quotation.mapper';
import { IQuotationItem } from '../interfaces/quotation.interface';
import { mapMongoId } from 'src/common/helper/mongo.helper';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';

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
          status: EQuotationStatus.PENDING_APPROVAL,
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

  private async prepareQuotation(
    payload: CreateQuotationDto | UpdateQuotationDto,
  ) {
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
    payloadItems: Array<CreateQuotationItemDto>,
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

  async deleteQuotation(quotationNo: string, user: AuthUser) {
    try {
      const quotation = await this.quotationRepository.softDelete(
        quotationNo,
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

  async getQuotationByNo(quotationNo: string): Promise<IQuotationRecord> {
    try {
      const quotation =
        await this.quotationRepository.getByQuotationNo(quotationNo);

      if (!quotation) {
        throw new BusinessException('4040', 'Quotation not found');
      }
      return QuotationMapper.toRecord(quotation);
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
    quotationNo: string,
    payload: ApproveQuotationDto,
    user: AuthUser,
  ) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      const quotation = await this.getQuotationByNo(quotationNo);

      if (quotation.status !== EQuotationStatus.PENDING_APPROVAL) {
        throw new BusinessException('4001', 'Quotation cannot be approved');
      }

      const result = await this.quotationRepository.approveQuotation(
        quotation.id,
        payload,
        user,
        session,
      );

      if (!result) {
        throw new BusinessException('5003', 'Failed to approve quotation');
      }

      await this.workOrderService.updateStatus(
        quotation.workOrder.workOrderNo,
        EWorkOrderStatus.WAITING_ASSIGNMENT,
        user,
      );

      await session.commitTransaction();

      return mapMongoId(result);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // กรณีที่ต้องการสร้าง Revision ของ Quotation เดิม โดยจะทำการ Mark Quotation เดิมเป็น Old Version และสร้าง Quotation ใหม่ที่เป็น Latest Version
  // จะใช้ กรณีที่ลูกค้า Reject Quotation และต้องการให้สร้าง Quotation ใหม่จาก Quotation เดิม
  async createRevision(
    quotationNo: string,
    payload: CreateQuotationRevisionDto,
    user: AuthUser,
  ) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      const oldQuotation = await this.getQuotationByNo(quotationNo);

      if (!oldQuotation.isLatest) {
        throw new BusinessException(
          '4001',
          'Only latest quotation can create revision',
        );
      }

      if (
        oldQuotation.status === EQuotationStatus.CANCELLED ||
        oldQuotation.status === EQuotationStatus.EXPIRED
      ) {
        throw new BusinessException(
          '4001',
          'Cancelled or expired quotation cannot create revision',
        );
      }

      let revisionItems: CreateQuotationItemDto[] = oldQuotation.items.map(
        (item) => ({
          itemType: item.itemType,
          productId: item.productId,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          remark: item.remark,
        }),
      );

      if (payload.items !== undefined) {
        revisionItems = payload.items;
      }

      if (payload.additionalItems !== undefined) {
        revisionItems = [...revisionItems, ...payload.additionalItems];
      }

      let includeVat = oldQuotation.includeVat;
      if (payload.includeVat !== undefined) {
        includeVat = payload.includeVat;
      }

      let taxPercent = oldQuotation.taxPercent;
      if (payload.taxPercent !== undefined) {
        taxPercent = payload.taxPercent;
      }

      let discountAmount = oldQuotation.discountAmount;
      if (payload.discountAmount !== undefined) {
        discountAmount = payload.discountAmount;
      }

      const revisionPayload: CreateQuotationDto = {
        workOrderId: oldQuotation.workOrder.id,
        validUntil: oldQuotation.validUntil,
        includeVat,
        taxPercent,
        discountAmount,
        customerRemark: oldQuotation.customerRemark,
        internalRemark: oldQuotation.internalRemark,
        items: revisionItems,
      };

      if (payload.validUntil !== undefined) {
        revisionPayload.validUntil = payload.validUntil;
      }

      if (payload.customerRemark !== undefined) {
        revisionPayload.customerRemark = payload.customerRemark;
      }

      if (payload.internalRemark !== undefined) {
        revisionPayload.internalRemark = payload.internalRemark;
      }
      const quotationData = await this.prepareQuotation(revisionPayload);

      const newQuotationNo = await this.documentNoService.generate(
        EDocumentType.QUOTATION,
      );
      await this.quotationRepository.markOldVersion(
        oldQuotation.id,
        user,
        session,
      );
      const quotation = await this.quotationRepository.createQuotation(
        {
          quotationNo: newQuotationNo,
          workOrderId: oldQuotation.workOrder.id,
          version: oldQuotation.version + 1,
          isLatest: true,
          partTotal: quotationData.partTotal,
          laborTotal: quotationData.laborTotal,
          serviceTotal: quotationData.serviceTotal,
          grandTotal: quotationData.grandTotal,
          includeVat: quotationData.includeVat,
          taxPercent: quotationData.taxPercent,
          discountAmount: quotationData.quotationDiscount,
          vatAmount: quotationData.vatAmount,
          validUntil: revisionPayload.validUntil,
          customerRemark: revisionPayload.customerRemark,
          internalRemark: revisionPayload.internalRemark,
          items: quotationData.items,
          status: EQuotationStatus.PENDING_APPROVAL,
        },
        user,
        session,
      );

      if (!quotation) {
        throw new BusinessException('5001', 'Failed to create quotation revision');
      }

      await this.workOrderService.updateCurrentQuotation(
        oldQuotation.workOrder.id,
        quotation._id.toString(),
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

  async rejectQuotation(quotationNo: string, reason: string, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      const quotation = await this.getQuotationByNo(quotationNo);

      if (quotation.status !== EQuotationStatus.PENDING_APPROVAL) {
        throw new BusinessException('4001', 'Quotation cannot be rejected');
      }

      const result = await this.quotationRepository.rejectQuotation(
        quotation.id,
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

  async updateQuotation(
    quotationNo: string,
    payload: UpdateQuotationDto,
    user: AuthUser,
  ) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const quotation =
        await this.quotationRepository.getByQuotationNo(quotationNo);

      if (!quotation) {
        throw new BusinessException('4040', 'Quotation not found');
      }

      if (
        quotation.status !== EQuotationStatus.DRAFT &&
        quotation.status !== EQuotationStatus.PENDING_APPROVAL
      ) {
        throw new BusinessException('4001', 'Quotation cannot be updated');
      }

      await this.workOrderService.getWorkOrderById(payload.workOrderId);

      const quotationData = await this.prepareQuotation(payload);
      const result = await this.quotationRepository.updateQuotation(
        quotationNo,
        {
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

      if (!result) {
        throw new BusinessException('5003', 'Failed to update quotation');
      }
      await session.commitTransaction();
      return QuotationMapper.toRecord(result);
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
