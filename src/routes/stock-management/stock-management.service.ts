import { Inject, Injectable } from '@nestjs/common';

import { BusinessException } from 'src/common/exceptions/business.exception';

import { StocksRepository } from 'src/repository/stock/stock.repository';
import { StockMovementRepository } from 'src/repository/stock-movement/stock-movement.repository';

import { AuthUser } from 'src/types/user.type';
import { CreateStockDto, UpdateStockDto } from './dtos/stock-management.dto';
import { EStockMovementType, EStockStatus } from './enums/stock.enum';

const PAGE = 1;
const LIMIT = 20;
const MIN_STOCK= 5;
@Injectable()
export class StockManagementService {
  constructor(
    @Inject(StocksRepository)
    private readonly stocksRepository: StocksRepository,

    @Inject(StockMovementRepository)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async getStockDetail(productId: string) {
    try {
      const stock = await this.ensureStockExists(productId);

      return this.mapStockResponse(stock);
    } catch (error) {
      throw error;
    }
  }

  async getStockList(page = PAGE, limit = LIMIT, keyword?: string) {
    try {
      const filter: any = {};

      if (keyword) {
        filter.sku = {
          $regex: keyword,
          $options: 'i',
        };
      }
      const result = await this.stocksRepository.getStocks(filter, page, limit);

      return {
        ...result,
        data: result.data.map((stock) => this.mapStockResponse(stock)),
      };
    } catch (error) {
      throw error;
    }
  }

  async createStock(payload: CreateStockDto, user: AuthUser) {
    try {
      const exists = await this.stocksRepository.existsByProductId(
        payload.productId,
      );

      if (exists) {
        throw new BusinessException('4001', 'Stock already exists');
      }

      return this.stocksRepository.createStock(
        {
          productId: payload.productId,
          sku: payload.sku,
          warehouseId: payload.warehouseId,
          quantity: payload.quantity ?? 0,
          reserved: payload.reserved ?? 0,
          minStock: payload.minStock ?? MIN_STOCK,
        },
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  async updateStock(
    productId: string,
    payload: UpdateStockDto,
    user: AuthUser,
  ) {
    try {
      await this.ensureStockExists(productId);

      const updated = await this.stocksRepository.updateByProductId(
        productId,
        payload,
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Update stock failed');
      }

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async receiveStock(productId: string, quantity: number, user: AuthUser) {
    try {
      const stock = await this.ensureStockExists(productId);
      const beforeQty = stock.quantity;
      const afterQty = beforeQty + quantity;
      const updated = await this.stocksRepository.increaseStock(
        productId,
        quantity,
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Receive stock failed');
      }

      await this.createMovement(
        {
          productId: stock.productId,
          sku: stock.sku,
          movementType: EStockMovementType.RECEIVE,
          quantity,
          beforeQty,
          afterQty,
        },
        user,
      );

      return {
        success: true,
        beforeQty,
        afterQty,
      };
    } catch (error) {
      throw error;
    }
  }

  async issueStock(productId: string, quantity: number, user: AuthUser) {
    try {
      const stock = await this.ensureStockExists(productId);
      const available = stock.quantity - stock.reserved;

      if (available < quantity) {
        throw new BusinessException('4002', 'Insufficient stock');
      }
      const beforeQty = stock.quantity;
      const afterQty = beforeQty - quantity;
      const updated = await this.stocksRepository.decreaseStock(
        productId,
        quantity,
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Issue stock failed');
      }

      await this.createMovement(
        {
          productId: stock.productId,
          sku: stock.sku,
          movementType: EStockMovementType.ISSUE,
          quantity,
          beforeQty,
          afterQty,
        },
        user,
      );

      return {
        success: true,
        beforeQty,
        afterQty,
      };
    } catch (error) {
      throw error;
    }
  }

  async reserveStock(productId: string, quantity: number, user: AuthUser) {
    try {
      const stock = await this.ensureStockExists(productId);
      const available = stock.quantity - stock.reserved;

      if (available < quantity) {
        throw new BusinessException('4002', 'Insufficient stock');
      }
      const updated = await this.stocksRepository.increaseReserved(
        productId,
        quantity,
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Reserve stock failed');
      }

      await this.createMovement(
        {
          productId: stock.productId,
          sku: stock.sku,
          movementType: EStockMovementType.RESERVE,
          quantity,
          beforeQty: stock.reserved,
          afterQty: stock.reserved + quantity,
        },
        user,
      );

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async releaseReservation(
    productId: string,
    quantity: number,
    user: AuthUser,
  ) {
    try {
      const stock = await this.ensureStockExists(productId);

      if (stock.reserved < quantity) {
        throw new BusinessException('4003', 'Reserved quantity not enough');
      }

      const updated = await this.stocksRepository.decreaseReserved(
        productId,
        quantity,
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Release reservation failed');
      }

      await this.createMovement(
        {
          productId: stock.productId,
          sku: stock.sku,
          movementType: EStockMovementType.RELEASE,
          quantity,
          beforeQty: stock.reserved,
          afterQty: stock.reserved - quantity,
        },
        user,
      );

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async adjustStock(productId: string, actualQuantity: number, user: AuthUser) {
    try {
      const stock = await this.ensureStockExists(productId);
      const beforeQty = stock.quantity;
      const afterQty = actualQuantity;
      const updated = await this.stocksRepository.updateByProductId(
        productId,
        {
          quantity: actualQuantity,
        },
        user,
      );

      if (!updated) {
        throw new BusinessException('5001', 'Adjust stock failed');
      }

      await this.createMovement(
        {
          productId: stock.productId,
          sku: stock.sku,
          movementType: EStockMovementType.ADJUST,
          quantity: Math.abs(actualQuantity - stock.quantity),
          beforeQty,
          afterQty,
        },
        user,
      );

      return {
        success: true,
        beforeQty,
        afterQty,
      };
    } catch (error) {
      throw error;
    }
  }

  async getMovementHistory(productId: string) {
    try {
      await this.ensureStockExists(productId);
      return this.stockMovementRepository.getMovements(productId);
    } catch (error) {
      throw error;
    }
  }

  async deleteStock(productId: string, user: AuthUser) {
    try {
      await this.ensureStockExists(productId);
      const deleted = await this.stocksRepository.softDelete(productId, user);

      if (!deleted) {
        throw new BusinessException('5002', 'Delete stock failed');
      }

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  private async ensureStockExists(productId: string) {
    const stock = await this.stocksRepository.getByProductId(productId);

    if (!stock) {
      throw new BusinessException('4040', 'Stock not found');
    }

    return stock;
  }

  private async createMovement(
    payload: {
      productId: any;
      sku: string;
      movementType:
        | EStockMovementType.ADJUST
        | EStockMovementType.ISSUE
        | EStockMovementType.RECEIVE
        | EStockMovementType.RELEASE
        | EStockMovementType.RESERVE;
      quantity: number;
      beforeQty: number;
      afterQty: number;
    },
    user: AuthUser,
  ) {
    await this.stockMovementRepository.create(payload, user);
  }

  private mapStockResponse(stock: any) {
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
