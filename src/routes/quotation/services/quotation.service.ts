import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Connection, Types } from 'mongoose';
import { EDocumentType } from 'src/common/enums/document-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';
import { QuotationRepository } from 'src/repository/quotation/quotation.repository';
import { WorkOrderService } from 'src/routes/work-order/services/work-order.service';
import { AuthUser } from 'src/types/user.type';
import {
  CreateQuotationDto,
  CreateQuotationItemDto,
  EQuotationItemType,
} from '../dtos/quotation.dto';
import { ProductsService } from 'src/routes/products/products.service';
import { IQuotationItem } from '../interfaces/quotation-record.interface';
import { error } from 'console';
import { InjectConnection } from '@nestjs/mongoose';

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
}
