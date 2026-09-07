import { Inject, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { getPagination } from 'src/common/utils/pagination.util';

import { StocksRepository } from 'src/repository/stock/stock.repository';
import { StockMovementRepository } from 'src/repository/stock-movement/stock-movement.repository';

import { AuthUser } from 'src/types/user.type';

import {
  AdjustStockDto,
  CreateStockDto,
  CreateStockMovementDto,
  getMovementListDto,
  IssueStockDto,
  ReceiveStockDto,
  ReleaseReservationDto,
  ReserveStockDto,
  ReturnStockDto,
  UpdateStockDto,
} from './dtos/stock-management.dto';

import { EStockMovementType, EStockStatus } from './enums/stock.enum';

import { IStockManagementResponse } from './interfaces/stock-management.interface';

const MIN_STOCK = 5;

@Injectable()
export class StockManagementService {
  constructor(
    @Inject(StocksRepository)
    private readonly stocksRepository: StocksRepository,

    @Inject(StockMovementRepository)
    private readonly movementRepository: StockMovementRepository,
  ) {}

  async getStockDetail(productId: string) {
    const stock = await this.ensureStockExists(productId);

    return this.mapStockResponse(stock);
  }

  async getStockDetailBySku(sku: string) {
    const stock = await this.stocksRepository.getBySku(sku);

    if (!stock) {
      throw new BusinessException('4040', 'Stock not found');
    }

    return this.mapStockResponse(stock);
  }
  async getMovementHistory(productId: string) {
    await this.ensureStockExists(productId);

    return this.movementRepository.getMovements(productId);
  }

  async getMovementList(dto: getMovementListDto, pagination: PaginationQuery) {
    const paging = getPagination(pagination);

    return this.movementRepository.getListMovements(dto, paging);
  }

  async createStock(
    payload: CreateStockDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    await this.validateCreateStock(payload.productId);

    return this.stocksRepository.createStock(
      {
        ...payload,
        quantity: payload.quantity ?? 0,
        reserved: payload.reserved ?? 0,
        minStock: payload.minStock ?? MIN_STOCK,
      },
      user,
      session,
    );
  }

  async updateStock(
    productId: string,
    payload: UpdateStockDto,
    user: AuthUser,
  ) {
    await this.ensureStockExists(productId);

    const updated = await this.stocksRepository.updateByProductId(
      productId,
      payload,
      user,
    );

    if (!updated) {
      throw new BusinessException('5001', 'Update stock failed');
    }

    return { success: true };
  }

  async deleteStock(productId: string, user: AuthUser) {
    await this.ensureStockExists(productId);

    const deleted = await this.stocksRepository.softDelete(productId, user);

    if (!deleted) {
      throw new BusinessException('5002', 'Delete stock failed');
    }

    return { success: true };
  }

  async receiveStock(productId: string, dto: ReceiveStockDto, user: AuthUser) {
    return this.processMovement(
      productId,
      dto,
      user,
      EStockMovementType.RECEIVE,
    );
  }

  // async issueStock(
  //   productId: string,
  //   dto: IssueStockDto,
  //   user: AuthUser,
  //   session?: ClientSession,
  // ) {
  //   return this.processMovement(
  //     productId,
  //     dto,
  //     user,
  //     EStockMovementType.ISSUE,
  //     session,
  //   );
  // }

  async returnStock(productId: string, dto: ReturnStockDto, user: AuthUser) {
    return this.processMovement(
      productId,
      dto,
      user,
      EStockMovementType.RETURN,
    );
  }

  async adjustStock(productId: string, dto: AdjustStockDto, user: AuthUser) {
    const stock = await this.ensureStockExists(productId);

    await this.stocksRepository.updateByProductId(
      productId,
      {
        quantity: dto.actualQuantity,
      },
      user,
    );

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.ADJUST,
      stock.quantity,
      dto.actualQuantity,
    );

    return {
      success: true,
      beforeQty: stock.quantity,
      afterQty: dto.actualQuantity,
    };
  }

  async reserveStock(
    productId: string,
    dto: ReserveStockDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const stock = await this.validateAvailableStock(
      productId,
      dto.quantity,
      session,
    );

    await this.stocksRepository.increaseReserved(
      productId,
      dto.quantity,
      user,
      session,
    );

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.RESERVE,
      stock.reserved,
      stock.reserved + dto.quantity,
      session,
    );

    return {
      success: true,
      reservedQty: dto.quantity,
    };
  }

  // "ยกเลิกการจอง แต่ของยังไม่ได้ถูกใช้"
  async releaseReservation(
    productId: string,
    dto: ReleaseReservationDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const stock = await this.ensureStockExists(productId, session);

    if (stock.reserved < dto.quantity) {
      throw new BusinessException('4003', 'Reserved quantity not enough');
    }

    const beforeReserved = stock.reserved;
    const afterReserved = beforeReserved - dto.quantity;

    await this.stocksRepository.decreaseReserved(
      productId,
      dto.quantity,
      user,
      session,
    );

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.RELEASE,
      beforeReserved,
      afterReserved,
      session,
    );

    return {
      success: true,
      releasedQty: dto.quantity,
      beforeReserved,
      afterReserved,
      available: stock.quantity - afterReserved,
    };
  }

  // "ของที่จองไว้ ถูกนำไปใช้จริงแล้ว"
  async consumeReservedStock(
    productId: string,
    dto: IssueStockDto,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const stock = await this.ensureStockExists(productId, session);

    if (stock.reserved < dto.quantity) {
      throw new BusinessException('4003', 'Reserved quantity not enough');
    }

    const beforeQty = stock.quantity;
    const consumed = await this.stocksRepository.consumeReservedStock(
      productId,
      dto.quantity,
      user,
      session,
    );

    if (!consumed) {
      throw new BusinessException('5002', 'Failed to consume reserved stock');
    }

    const afterQty = beforeQty - dto.quantity;

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.ISSUE,
      beforeQty,
      afterQty,
      session,
    );

    return {
      success: true,
      beforeQty,
      afterQty,
    };
  }

  private async processMovement(
    productId: string,
    dto: ReceiveStockDto | IssueStockDto | ReturnStockDto,
    user: AuthUser,
    type: EStockMovementType,
    session?: ClientSession,
  ) {
    const stock =
      type === EStockMovementType.ISSUE
        ? await this.validateAvailableStock(productId, dto.quantity, session)
        : await this.ensureStockExists(productId, session);

    const beforeQty = stock.quantity;

    await this.applyMovement(productId, dto.quantity, user, type, session);

    const afterQty = this.calculateAfterQty(beforeQty, dto.quantity, type);

    await this.createMovementRecord(
      stock,
      dto,
      user,
      type,
      beforeQty,
      afterQty,
      session,
    );

    return {
      success: true,
      beforeQty,
      afterQty,
    };
  }

  private async applyMovement(
    productId: string,
    quantity: number,
    user: AuthUser,
    type: EStockMovementType,
    session?: ClientSession,
  ) {
    if (
      type === EStockMovementType.RECEIVE ||
      type === EStockMovementType.RETURN
    ) {
      await this.stocksRepository.increaseStock(
        productId,
        quantity,
        user,
        session,
      );

      return;
    }

    await this.stocksRepository.decreaseStock(
      productId,
      quantity,
      user,
      session,
    );
  }

  private calculateAfterQty(
    beforeQty: number,
    quantity: number,
    type: EStockMovementType,
  ) {
    if (type === EStockMovementType.ISSUE) {
      return beforeQty - quantity;
    }

    return beforeQty + quantity;
  }

  private async createMovementRecord(
    stock: IStockManagementResponse,
    dto: any,
    user: AuthUser,
    movementType: EStockMovementType,
    beforeQty: number,
    afterQty: number,
    session?: ClientSession,
  ) {
    const movement: CreateStockMovementDto = {
      productId: stock.productId.toString(),
      sku: stock.sku,
      movementType,
      quantity: Math.abs(afterQty - beforeQty),
      beforeQty,
      afterQty,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      remark: dto.remark,
    };

    await this.movementRepository.createStockMovement(movement, user, session);
  }

  private async validateCreateStock(productId: string) {
    const exists = await this.stocksRepository.existsByProductId(productId);

    if (exists) {
      throw new BusinessException('4001', 'Stock already exists');
    }
  }

  private async validateAvailableStock(
    productId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    const stock = await this.ensureStockExists(productId, session);

    const available = stock.quantity - stock.reserved;

    if (available < quantity) {
      throw new BusinessException('4002', 'Insufficient stock');
    }

    return stock;
  }

  private async ensureStockExists(productId: string, session?: ClientSession) {
    const stock = await this.stocksRepository.getByProductId(
      productId,
      session,
    );

    if (!stock) {
      throw new BusinessException('4040', 'Stock not found');
    }

    return stock;
  }

  private mapStockResponse(stock: IStockManagementResponse) {
    const available = stock.quantity - stock.reserved;

    return {
      ...stock,
      available,
      status:
        available <= 0
          ? EStockStatus.OUT
          : available <= stock.minStock
            ? EStockStatus.LOW
            : EStockStatus.NORMAL,
    };
  }
}
