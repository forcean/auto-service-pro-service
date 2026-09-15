import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { AuthUser } from 'src/types/user.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DocumentNoService } from 'src/common/services/document-no.service';

import { WorkOrderService } from 'src/routes/work-order/services/work-order.service';
import { TaskService } from 'src/routes/task/task.service';
import { StockManagementService } from 'src/routes/stock-management/stock-management.service';

import { EDocumentType } from 'src/common/enums/document-type.enum';
import { EStockReferenceType } from 'src/routes/stock-management/enums/stock.enum';

import { EPartIssueReason, EPartIssueStatus } from '../enums/part-issue.enum';

import { PartIssueRepository } from 'src/repository/part-issue/part-issue.repository';
import { QuotationRepository } from 'src/repository/quotation/quotation.repository';
import { EQuotationItemType, EQuotationStatus } from 'src/routes/quotation/enums/quotation.enum';

import {
  CreatePartIssueDto,
  GetPartIssueWithPaginationDto,
  IssuePartIssueDto,
  CancelPartIssueDto,
  GetPartIssueWithPaginationDto,
} from '../dtos/part-issue.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

import {
  IIssuePartIssueItemRequest,
} from '../interfaces/part-issue.interface';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { getPagination } from 'src/common/utils/pagination.util';

@Injectable()
export class PartIssueService {
  constructor(
    @InjectConnection('autoservice')
    private readonly connection: Connection,

    @Inject(PartIssueRepository)
    private readonly partIssueRepository: PartIssueRepository,

    @Inject(QuotationRepository)
    private readonly quotationRepository: QuotationRepository,

    @Inject(StockManagementService)
    private readonly stockManagementService: StockManagementService,

    @Inject(WorkOrderService)
    private readonly workOrderService: WorkOrderService,

    @Inject(TaskService)
    private readonly taskService: TaskService,

    @Inject(DocumentNoService)
    private readonly documentNoService: DocumentNoService,
  ) {}

  // ============================================================
  // GET LIST
  // ============================================================

  async getIssuesWithPagination(
    query: GetPartIssueWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = getPagination(query);

    return this.partIssueRepository.findAllWithPaginated(
      { page, limit, skip },
      query,
      sortBy ?? { createdAt: 'desc' },
    );
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Create Part Issue
   *
   * ยังไม่ Reserve
   * ยังไม่ตัด Stock
   */
  async createIssue(payload: CreatePartIssueDto, user: AuthUser) {
    const quotation = await this.validateCreateIssue(payload);
    const issueNo = await this.documentNoService.generate(
      EDocumentType.PART_ISSUE,
    );
    const issue = await this.partIssueRepository.createPartIssue(
      {
        issueNo,
        workOrderNo: payload.workOrderNo,
        taskNo: payload.taskNo,
        quotationId: payload.quotationId,
        quotationNo: quotation.quotationNo,
        items: payload.items.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          requestedQty: item.requestedQty,
          reservedQty: 0,
          issuedQty: 0,
          reason: item.reason,
          isAdditionalCharge: item.isAdditionalCharge,
          unitPrice: item.unitPrice,
          remark: item.remark,
        })),
        requestedBy: user.publicId,
        requestedByName: user.publicId,
        requestedAt: new Date(),
        remark: payload.remark,
      },
      user,
    );

    if (!issue) {
      throw new BusinessException('5001', 'Failed to create part issue');
    }
    return issue;
  }

  // ============================================================
  // RESERVE
  // ============================================================

  /**
   * Reserve Stock
   *
   * Stock:
   * quantity  = ไม่เปลี่ยน
   * reserved  = เพิ่ม
   *
   * PartIssue:
   * reservedQty = เพิ่ม
   */
  async reserve(issueNo: string, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      let result;

      await session.withTransaction(async () => {
        const issue = await this.partIssueRepository.getPartIssueByIssueNo(
          issueNo,
          session,
        );

        if (!issue) {
          throw new BusinessException('4040', 'Part issue not found');
        }

        this.validateCanReserve(issue.status);
        const updatedItems = issue.items.map((item) => ({
          productId: item.productId.toString(),
          sku: item.sku,
          productName: item.productName,
          requestedQty: item.requestedQty,
          reservedQty: item.reservedQty,
          issuedQty: item.issuedQty,
          reason: item.reason,
          isAdditionalCharge: item.isAdditionalCharge,
          unitPrice: item.unitPrice,
          remark: item.remark,
        }));

        for (const item of updatedItems) {
          const remainingQty =
            item.requestedQty - item.reservedQty - item.issuedQty;

          if (remainingQty <= 0) {
            continue;
          }

          await this.stockManagementService.reserveStock(
            item.productId,
            {
              quantity: remainingQty,
              referenceType: EStockReferenceType.PART_ISSUE,
              referenceId: issue.issueNo,
              remark: `Reserve for ${issue.workOrderNo}${
                issue.taskNo ? `/${issue.taskNo}` : ''
              }`,
            },
            user,
            session,
          );

          item.reservedQty += remainingQty;
        }

        const allReserved = updatedItems.every(
          (item) => item.reservedQty + item.issuedQty >= item.requestedQty,
        );

        const status = allReserved
          ? EPartIssueStatus.RESERVED
          : EPartIssueStatus.PARTIAL;

        result = await this.partIssueRepository.updateItems(
          issueNo,
          {
            items: updatedItems,
            status,
            updatedBy: user.publicId,
          },
          session,
        );

        if (!result) {
          throw new BusinessException('5002', 'Failed to reserve part issue');
        }
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // ISSUE
  // ============================================================

  /**
   * Issue / Consume Stock
   *
   * ใช้เฉพาะ Stock ที่ถูก Reserve แล้ว
   *
   * Stock:
   * quantity ↓
   * reserved ↓
   *
   * PartIssue:
   * reservedQty ↓
   * issuedQty ↑
   */
  async issue(issueNo: string, payload: IssuePartIssueDto, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      let result;

      await session.withTransaction(async () => {
        const issue = await this.partIssueRepository.getPartIssueByIssueNo(
          issueNo,
          session,
        );

        if (!issue) {
          throw new BusinessException('4040', 'Part issue not found');
        }

        this.validateCanIssue(issue.status);
        this.validateIssueItems(issue.items, payload.items);
        const updatedItems = issue.items.map((issueItem) => {
          const issuedItem = payload.items.find(
            (item) => item.productId === issueItem.productId.toString(),
          );

          if (!issuedItem) {
            return {
              productId: issueItem.productId.toString(),
              sku: issueItem.sku,
              productName: issueItem.productName,
              requestedQty: issueItem.requestedQty,
              reservedQty: issueItem.reservedQty,
              issuedQty: issueItem.issuedQty,
              reason: issueItem.reason,
              isAdditionalCharge: issueItem.isAdditionalCharge,
              unitPrice: issueItem.unitPrice,
              remark: issueItem.remark,
            };
          }

          return {
            productId: issueItem.productId.toString(),
            sku: issueItem.sku,
            productName: issueItem.productName,
            requestedQty: issueItem.requestedQty,
            reservedQty: issueItem.reservedQty - issuedItem.issuedQty,
            issuedQty: issueItem.issuedQty + issuedItem.issuedQty,
            reason: issueItem.reason,
            isAdditionalCharge: issueItem.isAdditionalCharge,
            unitPrice: issueItem.unitPrice,
            remark: issuedItem.remark ?? issueItem.remark,
          };
        });

        /**
         * Consume Reserved Stock
         *
         * ไม่ต้อง release reservation ซ้ำ
         */
        for (const item of payload.items) {
          await this.stockManagementService.consumeReservedStock(
            item.productId,
            {
              quantity: item.issuedQty,
              referenceType: EStockReferenceType.PART_ISSUE,
              referenceId: issue.issueNo,
              remark:
                item.remark ??
                payload.remark ??
                `Issue for ${issue.workOrderNo}${
                  issue.taskNo ? `/${issue.taskNo}` : ''
                }`,
            },
            user,
            session,
          );
        }

        const allIssued = updatedItems.every(
          (item) => item.issuedQty >= item.requestedQty,
        );
        const hasIssued = updatedItems.some((item) => item.issuedQty > 0);
        const hasReserved = updatedItems.some((item) => item.reservedQty > 0);
        let status: EPartIssueStatus;

        if (allIssued) {
          status = EPartIssueStatus.ISSUED;
        } else if (hasIssued) {
          status = EPartIssueStatus.PARTIAL;
        } else if (hasReserved) {
          status = EPartIssueStatus.RESERVED;
        } else {
          status = EPartIssueStatus.REQUESTED;
        }

        result = await this.partIssueRepository.updateItems(
          issueNo,
          {
            items: updatedItems,
            status,
            updatedBy: user.publicId,
          },
          session,
        );

        if (!result) {
          throw new BusinessException('5002', 'Failed to issue part');
        }
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // GET DETAIL
  // ============================================================

  async getIssueByNo(issueNo: string) {
    const issue = await this.partIssueRepository.getPartIssueByIssueNo(issueNo);

    if (!issue) {
      throw new BusinessException('4040', 'Part issue not found');
    }

    return issue;
  }

  async getIssuesWithPagination(
    query: GetPartIssueWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = getPagination(query);
    return this.partIssueRepository.findAllWithPaginated(
      { page, limit, skip },
      query,
      sortBy,
    );
  }

  async getQuotationPartAvailability(quotationId: string) {
    const quotation = await this.quotationRepository.getQuotationById(quotationId);
    if (!quotation) throw new BusinessException('4042', 'Quotation not found');
    if (quotation.status !== EQuotationStatus.APPROVED) {
      throw new BusinessException('4006', 'Quotation must be approved before requesting parts');
    }

    const issues = await this.partIssueRepository.getPartIssueByQuotationId(quotationId);
    const usage = new Map<string, { requestedQty: number; reservedQty: number; issuedQty: number }>();
    for (const issue of issues.filter((item) => item.status !== EPartIssueStatus.CANCELLED)) {
      for (const item of issue.items) {
        // A complimentary additional part is deliberately outside the quoted
        // quantity.  It must not reduce the remaining quantity of a quoted
        // item that happens to be the same product.
        if (
          item.reason === EPartIssueReason.ADDITIONAL &&
          !item.isAdditionalCharge
        ) {
          continue;
        }

        const productId = item.productId.toString();
        const totals = usage.get(productId) ?? { requestedQty: 0, reservedQty: 0, issuedQty: 0 };
        totals.requestedQty += item.requestedQty;
        totals.reservedQty += item.reservedQty;
        totals.issuedQty += item.issuedQty;
        usage.set(productId, totals);
      }
    }

    const items = (quotation.items as any[])
      .filter((item) => item.itemType === EQuotationItemType.PART && item.productId)
      .map((item) => {
        const productId = item.productId.toString();
        const totals = usage.get(productId) ?? { requestedQty: 0, reservedQty: 0, issuedQty: 0 };
        return {
          productId,
          sku: item.sku,
          productName: item.description,
          quotationQty: item.quantity,
          requestedQty: totals.requestedQty,
          reservedQty: totals.reservedQty,
          issuedQty: totals.issuedQty,
          availableQty: Math.max(0, item.quantity - totals.requestedQty),
          unitPrice: item.unitPrice,
        };
      });

    return { quotationId, quotationNo: quotation.quotationNo, items };
  }

  // ============================================================
  // CANCEL
  // ============================================================

  /**
   * Cancel Part Issue
   *
   * ถ้ามี reservedQty:
   * release reservation ก่อน
   *
   * จากนั้น:
   * reservedQty = 0
   * status = CANCELLED
   */
  async cancel(issueNo: string, payload: CancelPartIssueDto, user: AuthUser) {
    const session = await this.connection.startSession();

    try {
      let result;

      await session.withTransaction(async () => {
        const issue = await this.partIssueRepository.getPartIssueByIssueNo(
          issueNo,
          session,
        );

        if (!issue) {
          throw new BusinessException('4040', 'Part issue not found');
        }

        if (issue.status === EPartIssueStatus.ISSUED) {
          throw new BusinessException(
            '4001',
            'Issued part cannot be cancelled',
          );
        }

        if (issue.status === EPartIssueStatus.CANCELLED) {
          throw new BusinessException('4001', 'Part issue already cancelled');
        }

        /**
         * Release reservation ที่เหลือ
         */
        for (const item of issue.items) {
          if (item.reservedQty <= 0) {
            continue;
          }

          await this.stockManagementService.releaseReservation(
            item.productId.toString(),
            {
              quantity: item.reservedQty,
              referenceType: EStockReferenceType.PART_ISSUE,
              referenceId: issue.issueNo,
              remark:
                payload.remark ??
                'Release reservation because part issue was cancelled',
            },
            user,
            session,
          );
        }

        const updatedItems = issue.items.map((item) => ({
          productId: item.productId.toString(),
          sku: item.sku,
          productName: item.productName,

          requestedQty: item.requestedQty,
          reservedQty: 0,
          issuedQty: item.issuedQty,

          reason: item.reason,
          isAdditionalCharge: item.isAdditionalCharge,
          unitPrice: item.unitPrice,
          remark: item.remark,
        }));

        result = await this.partIssueRepository.cancel(
          issueNo,
          {
            items: updatedItems,
            remark: payload.remark,
            updatedBy: user.publicId,
          },
          session,
        );

        if (!result) {
          throw new BusinessException('5004', 'Failed to cancel part issue');
        }
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  private async validateCreateIssue(payload: CreatePartIssueDto) {
    /**
     * Work Order
     */
    const workOrder = await this.workOrderService.getWorkOrderByNo(
      payload.workOrderNo,
    );

    if (!workOrder) {
      throw new BusinessException('4040', 'Work Order not found');
    }

    const quotation = await this.quotationRepository.getQuotationById(payload.quotationId);
    if (!quotation) throw new BusinessException('4042', 'Quotation not found');
    const quotationWorkOrder = quotation.workOrderId as any;
    if ((quotationWorkOrder?._id ?? quotationWorkOrder).toString() !== workOrder._id.toString()) {
      throw new BusinessException('4007', 'Quotation does not belong to Work Order');
    }

    const availability = await this.getQuotationPartAvailability(payload.quotationId);
    const availableByProduct = new Map(availability.items.map((item) => [item.productId, item]));
    for (const item of payload.items) {
      const isComplimentaryAdditional =
        item.reason === EPartIssueReason.ADDITIONAL &&
        !item.isAdditionalCharge;

      // Complimentary additional parts are approved internally and are still
      // traceable to an approved quotation/work order, but are not a billed
      // quotation line.  Charged additions must be put in a new approved
      // quotation first, so they continue through the normal availability
      // validation below.
      if (isComplimentaryAdditional) {
        continue;
      }

      const available = availableByProduct.get(item.productId);
      if (!available) throw new BusinessException('4008', `Product ${item.sku} is not in quotation`);
      if (item.requestedQty > available.availableQty) {
        throw new BusinessException('4009', `Requested quantity exceeds quotation remaining quantity for ${item.sku}`);
      }
    }

    /**
     * Task
     */
    if (payload.taskNo) {
      const task = await this.taskService.getTaskByNo(payload.taskNo);

      if (!task) {
        throw new BusinessException('4041', 'Task not found');
      }

      if (task.workOrderNo !== payload.workOrderNo) {
        throw new BusinessException(
          '4001',
          'Task does not belong to Work Order',
        );
      }
    }

    /**
     * Items
     */
    if (!payload.items || payload.items.length === 0) {
      throw new BusinessException(
        '4002',
        'Part issue must contain at least one item',
      );
    }

    /**
     * Duplicate product
     */
    const productIds = payload.items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      throw new BusinessException(
        '4002',
        'Duplicate product is not allowed in part issue',
      );
    }

    return quotation;
  }

  private validateCanReserve(status: EPartIssueStatus) {
    if (status === EPartIssueStatus.ISSUED) {
      throw new BusinessException('4001', 'Part issue already fully issued');
    }

    if (status === EPartIssueStatus.CANCELLED) {
      throw new BusinessException(
        '4001',
        'Cancelled part issue cannot be reserved',
      );
    }
  }

  private validateCanIssue(status: EPartIssueStatus) {
    if (status === EPartIssueStatus.ISSUED) {
      throw new BusinessException('4001', 'Part issue already fully issued');
    }

    if (status === EPartIssueStatus.CANCELLED) {
      throw new BusinessException(
        '4001',
        'Cancelled part issue cannot be issued',
      );
    }
  }

  private validateIssueItems(
    issueItems: any[],
    requestedItems: IIssuePartIssueItemRequest[],
  ) {
    if (!requestedItems?.length) {
      throw new BusinessException('4002', 'Issue items are required');
    }

    /**
     * Duplicate product
     */
    const productIds = requestedItems.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      throw new BusinessException('4002', 'Duplicate product is not allowed');
    }

    for (const item of requestedItems) {
      const issueItem = issueItems.find(
        (x) => x.productId.toString() === item.productId,
      );

      if (!issueItem) {
        throw new BusinessException(
          '4002',
          `Product ${item.productId} is not part of this issue`,
        );
      }

      if (!Number.isInteger(item.issuedQty) || item.issuedQty <= 0) {
        throw new BusinessException(
          '4003',
          'Issued quantity must be greater than 0',
        );
      }

      /**
       * ต้องจ่ายจากของที่ reserve เท่านั้น
       */
      if (item.issuedQty > issueItem.reservedQty) {
        throw new BusinessException(
          '4003',
          `Issued quantity cannot exceed reserved quantity for ${issueItem.sku}`,
        );
      }
    }
  }
}
