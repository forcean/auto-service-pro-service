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
  ReturnStockDto,
  UpdateStockDto,
} from './dtos/stock-management.dto';

import {
  EStockMovementType,
  EStockStatus,
} from './enums/stock.enum';

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

    const updated =
      await this.stocksRepository.updateByProductId(
        productId,
        payload,
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Update stock failed',
      );
    }

    return { success: true };
  }

  async receiveStock(
    productId: string,
    dto: ReceiveStockDto,
    user: AuthUser,
  ) {
    return this.processMovement(
      productId,
      dto,
      user,
      EStockMovementType.RECEIVE,
    );
  }

  async issueStock(
    productId: string,
    dto: IssueStockDto,
    user: AuthUser,
  ) {
    return this.processMovement(
      productId,
      dto,
      user,
      EStockMovementType.ISSUE,
    );
  }

  async returnStock(
    productId: string,
    dto: ReturnStockDto,
    user: AuthUser,
  ) {
    return this.processMovement(
      productId,
      dto,
      user,
      EStockMovementType.RETURN,
    );
  }

  async reserveStock(
    productId: string,
    dto: ReceiveStockDto,
    user: AuthUser,
  ) {
    const stock =
      await this.validateAvailableStock(
        productId,
        dto.quantity,
      );

    await this.stocksRepository.increaseReserved(
      productId,
      dto.quantity,
      user,
    );

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.RESERVE,
      stock.reserved,
      stock.reserved + dto.quantity,
    );

    return { success: true };
  }

  async releaseReservation(
    productId: string,
    dto: ReleaseReservationDto,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(productId);

    if (stock.reserved < dto.quantity) {
      throw new BusinessException(
        '4003',
        'Reserved quantity not enough',
      );
    }

    await this.stocksRepository.decreaseReserved(
      productId,
      dto.quantity,
      user,
    );

    await this.createMovementRecord(
      stock,
      dto,
      user,
      EStockMovementType.RELEASE,
      stock.reserved,
      stock.reserved - dto.quantity,
    );

    return { success: true };
  }

  async adjustStock(
    productId: string,
    dto: AdjustStockDto,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(productId);

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

  async getMovementHistory(productId: string) {
    await this.ensureStockExists(productId);

    return this.movementRepository.getMovements(
      productId,
    );
  }

  async getMovementList(
    dto: getMovementListDto,
    pagination: PaginationQuery,
  ) {
    const paging =
      getPagination(pagination);

    return this.movementRepository.getListMovements(
      dto,
      paging,
    );
  }

  async deleteStock(
    productId: string,
    user: AuthUser,
  ) {
    await this.ensureStockExists(productId);

    const deleted =
      await this.stocksRepository.softDelete(
        productId,
        user,
      );

    if (!deleted) {
      throw new BusinessException(
        '5002',
        'Delete stock failed',
      );
    }

    return { success: true };
  }

  private async processMovement(
    productId: string,
    dto:
      | ReceiveStockDto
      | IssueStockDto
      | ReturnStockDto,
    user: AuthUser,
    type: EStockMovementType,
  ) {
    const stock =
      type === EStockMovementType.ISSUE
        ? await this.validateAvailableStock(
            productId,
            dto.quantity,
          )
        : await this.ensureStockExists(
            productId,
          );

    const beforeQty = stock.quantity;
    await this.applyMovement(
      productId,
      dto.quantity,
      user,
      type,
    );
    const afterQty =
      this.calculateAfterQty(
        beforeQty,
        dto.quantity,
        type,
      );
    await this.createMovementRecord(
      stock,
      dto,
      user,
      type,
      beforeQty,
      afterQty,
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
  ) {
    if (
      type === EStockMovementType.RECEIVE ||
      type === EStockMovementType.RETURN
    ) {
      await this.stocksRepository.increaseStock(
        productId,
        quantity,
        user,
      );

      return;
    }
    await this.stocksRepository.decreaseStock(
      productId,
      quantity,
      user,
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

    await this.movementRepository.createStockMovement(
      movement,
      user,
    );
  }

  private async validateCreateStock(
    productId: string,
  ) {
    const exists =
      await this.stocksRepository.existsByProductId(
        productId,
      );

    if (exists) {
      throw new BusinessException(
        '4001',
        'Stock already exists',
      );
    }
  }

  private async validateAvailableStock(
    productId: string,
    quantity: number,
  ) {
    const stock =
      await this.ensureStockExists(productId);

    const available =
      stock.quantity -
      stock.reserved;

    if (available < quantity) {
      throw new BusinessException(
        '4002',
        'Insufficient stock',
      );
    }

    return stock;
  }

  private async ensureStockExists(
    productId: string,
  ) {
    const stock =
      await this.stocksRepository.getByProductId(
        productId,
      );

    if (!stock) {
      throw new BusinessException(
        '4040',
        'Stock not found',
      );
    }

    return stock;
  }

  private mapStockResponse(
    stock: IStockManagementResponse,
  ) {
    const available =
      stock.quantity -
      stock.reserved;

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