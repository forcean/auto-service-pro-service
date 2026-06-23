import { Inject, Injectable } from '@nestjs/common';

import { BusinessException } from 'src/common/exceptions/business.exception';

import { StocksRepository } from 'src/repository/stock/stock.repository';
import { StockMovementRepository } from 'src/repository/stock-movement/stock-movement.repository';

import { AuthUser } from 'src/types/user.type';
import { createStockDto, updateStockDto } from './dtos/stock-management.dto';
import { EStockMovementType, EStockStatus } from './enums/stock.enum';


@Injectable()
export class StockManagementService {
  constructor(
    @Inject(StocksRepository)
    private readonly stocksRepository: StocksRepository,

    @Inject(StockMovementRepository)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async getStockDetail(
    productId: string,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    return this.mapStockResponse(
      stock,
    );
  }

  async getStockList(
    page = 1,
    limit = 20,
    keyword?: string,
  ) {
    const filter: any = {};

    if (keyword) {
      filter.sku = {
        $regex: keyword,
        $options: 'i',
      };
    }
    const result =
      await this.stocksRepository.getStocks(
        filter,
        page,
        limit,
      );

    return {
      ...result,
      data: result.data.map(
        (stock) =>
          this.mapStockResponse(
            stock,
          ),
      ),
    };
  }

  async createStock(
    payload: createStockDto,
    user: AuthUser,
  ) {
    const exists =
      await this.stocksRepository.existsByProductId(
        payload.productId,
      );

    if (exists) {
      throw new BusinessException(
        '4001',
        'Stock already exists',
      );
    }

    return this.stocksRepository.createStock(
      {
        productId:
          payload.productId,
        sku: payload.sku,
        warehouseId:
          payload.warehouseId,
        quantity:
          payload.quantity ?? 0,
        reserved:
          payload.reserved ?? 0,
        minStock:
          payload.minStock ?? 5,
      },
      user,
    );
  }

  async updateStock(
    productId: string,
    payload: updateStockDto,
    user: AuthUser,
  ) {
    await this.ensureStockExists(
      productId,
    );

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

    return {
      success: true,
    };
  }

  async receiveStock(
    productId: string,
    quantity: number,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    const beforeQty =
      stock.quantity;

    const afterQty =
      beforeQty + quantity;

    const updated =
      await this.stocksRepository.increaseStock(
        productId,
        quantity,
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Receive stock failed',
      );
    }

    await this.createMovement(
      {
        productId:
          stock.productId,
        sku: stock.sku,
        movementType:
          EStockMovementType.RECEIVE,
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
  }

  async issueStock(
    productId: string,
    quantity: number,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    const available =
      stock.quantity -
      stock.reserved;

    if (
      available < quantity
    ) {
      throw new BusinessException(
        '4002',
        'Insufficient stock',
      );
    }

    const beforeQty =
      stock.quantity;

    const afterQty =
      beforeQty - quantity;

    const updated =
      await this.stocksRepository.decreaseStock(
        productId,
        quantity,
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Issue stock failed',
      );
    }

    await this.createMovement(
      {
        productId:
          stock.productId,
        sku: stock.sku,
        movementType:
          EStockMovementType.ISSUE,
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
  }

  async reserveStock(
    productId: string,
    quantity: number,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    const available =
      stock.quantity -
      stock.reserved;

    if (
      available < quantity
    ) {
      throw new BusinessException(
        '4002',
        'Insufficient stock',
      );
    }

    const updated =
      await this.stocksRepository.increaseReserved(
        productId,
        quantity,
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Reserve stock failed',
      );
    }

    await this.createMovement(
      {
        productId:
          stock.productId,
        sku: stock.sku,
        movementType:
          EStockMovementType.RESERVE,
        quantity,
        beforeQty:
          stock.reserved,
        afterQty:
          stock.reserved +
          quantity,
      },
      user,
    );

    return {
      success: true,
    };
  }

  async releaseReservation(
    productId: string,
    quantity: number,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    if (
      stock.reserved <
      quantity
    ) {
      throw new BusinessException(
        '4003',
        'Reserved quantity not enough',
      );
    }

    const updated =
      await this.stocksRepository.decreaseReserved(
        productId,
        quantity,
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Release reservation failed',
      );
    }

    await this.createMovement(
      {
        productId:
          stock.productId,
        sku: stock.sku,
        movementType:
          EStockMovementType.RELEASE,
        quantity,
        beforeQty:
          stock.reserved,
        afterQty:
          stock.reserved -
          quantity,
      },
      user,
    );

    return {
      success: true,
    };
  }

  async adjustStock(
    productId: string,
    actualQuantity: number,
    user: AuthUser,
  ) {
    const stock =
      await this.ensureStockExists(
        productId,
      );

    const beforeQty =
      stock.quantity;

    const afterQty =
      actualQuantity;

    const updated =
      await this.stocksRepository.updateByProductId(
        productId,
        {
          quantity:
            actualQuantity,
        },
        user,
      );

    if (!updated) {
      throw new BusinessException(
        '5001',
        'Adjust stock failed',
      );
    }

    await this.createMovement(
      {
        productId:
          stock.productId,
        sku: stock.sku,
        movementType:
          EStockMovementType.ADJUST,
        quantity: Math.abs(
          actualQuantity -
            stock.quantity,
        ),
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
  }

  async getMovementHistory(
    productId: string,
  ) {
    await this.ensureStockExists(
      productId,
    );

    return this.stockMovementRepository.getMovements(
      productId,
    );
  }

  async deleteStock(
    productId: string,
    user: AuthUser,
  ) {
    await this.ensureStockExists(
      productId,
    );

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

    return {
      success: true,
    };
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

  private async createMovement(
    payload: {
      productId: any;
      sku: string;
      movementType:
        EStockMovementType.ADJUST|
        EStockMovementType.ISSUE|
        EStockMovementType.RECEIVE|
        EStockMovementType.RELEASE|
        EStockMovementType.RESERVE,
      quantity: number;
      beforeQty: number;
      afterQty: number;
    },
    user: AuthUser,
  ) {
    await this.stockMovementRepository.create(
      payload,
      user,
    );
  }

  private mapStockResponse(
    stock: any,
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
          : available <=
              stock.minStock
            ? EStockStatus.LOW
            : EStockStatus.NORMAL
    };
  }
}