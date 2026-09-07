import { Inject, Injectable } from '@nestjs/common';
import {
  createProductDto,
  stockRequestDto,
  getProductCategoriesDto,
  getProductListDto,
  updateProductDto,
} from './products.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ProductsRepository } from 'src/repository/products/products.repository';
import { AuthUser } from 'src/types/user.type';
import { ProductCategoriesRepository } from 'src/repository/product-category/product-category.repository';
import { ProductBrandsRepository } from 'src/repository/product-brands/product-brands.repository';
import { VehiclesRepository } from 'src/repository/vehicles/vehicles.repository';
import { SkuCountersRepository } from 'src/repository/sku-counters/sku-counters.repository';
import { VehicleBrandsRepository } from 'src/repository/vehicle-brands/vehicle-brands.repository';
import { VehicleModelsRepository } from 'src/repository/vehicle-models/vehicle-models.repository';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { getPagination } from 'src/common/utils/pagination.util';
import { IProductDetailResponse } from './interfaces/products.interface';
import { StockManagementService } from '../stock-management/stock-management.service';
import { CreateStockDto } from '../stock-management/dtos/stock-management.dto';
import { Types } from 'mongoose';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(ProductsRepository)
    private readonly productsRepository: ProductsRepository,
    @Inject(ProductCategoriesRepository)
    private readonly productCategoriesRepository: ProductCategoriesRepository,
    @Inject(ProductBrandsRepository)
    private readonly productBrandsRepository: ProductBrandsRepository,
    @Inject(VehiclesRepository)
    private readonly vehiclesRepository: VehiclesRepository,
    @Inject(SkuCountersRepository)
    private readonly skuCountersRepository: SkuCountersRepository,
    @Inject(VehicleBrandsRepository)
    private readonly vehicleBrandsRepository: VehicleBrandsRepository,
    @Inject(VehicleModelsRepository)
    private readonly vehicleModelsRepository: VehicleModelsRepository,
    @Inject(StockManagementService)
    private readonly stockManagementService: StockManagementService,
  ) {}

  async createProduct(dto: createProductDto, authUser: AuthUser) {
    const session = await this.productsRepository.startSession();
    try {
      session.startTransaction();
      if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
        throw new BusinessException(
          '4030',
          'Only system owner or admin can create product',
        );
      }

      const categoryCode =
        await this.productCategoriesRepository.getCategoryById(dto.categoryId);

      if (!categoryCode) {
        throw new BusinessException('4040', 'Product category not found');
      }

      const brandCode = await this.productBrandsRepository.getBrandById(
        dto.brandId,
      );

      if (!brandCode) {
        throw new BusinessException('4041', 'Product brand not found');
      }

      const segments: string[] = [];

      segments.push(categoryCode.code);
      segments.push(brandCode.code);

      if (dto.vehicles?.length) {
        const firstVehicle = dto.vehicles[0].vehicleId;
        const vehicleCode =
          await this.vehiclesRepository.getVehicleById(firstVehicle);
        if (!vehicleCode) {
          throw new BusinessException('4042', 'Product vehicle not found');
        }
        segments.push(vehicleCode.modelCode);
        segments.push(vehicleCode.brandCode);
      }

      const prefix = segments.join('-');
      const runningNumber =
        await this.skuCountersRepository.getNextSequence(prefix);
      const sku = `${prefix}-${runningNumber.toString().padStart(3, '0')}`;

      const isProductExist = await this.productsRepository.getProductBySku(sku);
      if (isProductExist) {
        throw new BusinessException(
          '4091',
          'Product with the same SKU already exists',
        );
      }

      const createProduct = await this.productsRepository.createProduct(
        sku,
        dto,
        authUser,
        session,
      );

      if (!createProduct) {
        throw new BusinessException('4012', 'Failed to create product');
      }

      if (dto.stockInfo) {
        const res = this.buildCreateStock(dto.stockInfo, createProduct.id, sku);
        const stocked = await this.stockManagementService.createStock(
          res,
          authUser,
          session,
        );
        if (!stocked) {
          throw new BusinessException('4012', 'Failed to create stock');
        }
      }
      await session.commitTransaction();
      return createProduct;
    } catch (error) {
      await session.abortTransaction();
      console.error(
        `Error creating product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteProduct(skuId: string, authUser: AuthUser) {
    try {
      if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
        throw new BusinessException(
          '4030',
          'Only system owner or admin can delete product',
        );
      }

      const getProduct = await this.productsRepository.getProductBySku(skuId);

      if (!getProduct) {
        throw new BusinessException('4040', 'Product not found');
      }

      const deleteProduct = await this.productsRepository.deleteProductBySku(
        skuId,
        authUser,
      );

      if (!deleteProduct) {
        throw new BusinessException('4012', 'Failed to delete product');
      }
    } catch (error) {
      console.error(
        `Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getProductCategories(dto: getProductCategoriesDto) {
    try {
      const getCategories =
        await this.productCategoriesRepository.getProductCategories(dto);

      if (!getCategories) {
        throw new BusinessException('4040', 'No product categories found');
      }

      const tree = await this.buildTree(getCategories);
      return { categories: tree };
    } catch (error) {
      console.error(
        `Error getting product categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getProductBrands(isActive: boolean) {
    try {
      const getBrands =
        await this.productBrandsRepository.getProductBrands(isActive);

      if (!getBrands) {
        throw new BusinessException('4041', 'No product brands found');
      }
      return {
        brands: getBrands.map((data) => ({
          id: data._id,
          name: data.name,
          slug: data.slug,
          code: data.code,
          country: data.country,
          logoUrl: data.logo?.url,
        })),
      };
    } catch (error) {
      console.error(
        `Error getting product brands: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicleBrands(isActive: boolean) {
    try {
      const getVehiclesBrand =
        await this.vehicleBrandsRepository.getVehicleBrands(isActive);
      if (!getVehiclesBrand) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      return {
        vehicleBrands: getVehiclesBrand.map((data) => ({
          name: data.brand,
          code: data.brandCode,
        })),
      };
    } catch (error) {
      console.error(
        `Error getting product vehicles by brand: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicleModelsByBrand(brandCode: string, isActive: boolean) {
    try {
      const getVehicleModels =
        await this.vehicleModelsRepository.getModelsByBrand(
          brandCode,
          isActive,
        );
      if (!getVehicleModels) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      return {
        vehicleModels: getVehicleModels.map((data) => ({
          model: data.model,
          modelCode: data.modelCode,
          generation: data.generation,
        })),
      };
    } catch (error) {
      console.error(
        `Error getting product vehicles by brand: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async buildTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    categories.forEach((cat) => {
      const { _id, ...rest } = cat;
      map.set(_id.toString(), {
        id: _id,
        ...rest,
        children: [],
      });
    });

    categories.forEach((cat) => {
      if (cat.parentId) {
        const parent = map.get(cat.parentId.toString());
        if (parent) {
          parent.children.push(map.get(cat._id.toString()));
        }
      } else {
        roots.push(map.get(cat._id.toString()));
      }
    });

    return roots;
  }

  async updateProductBySku(
    sku: string,
    updateData: updateProductDto,
    authUser: AuthUser,
  ) {
    try {
      if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
        throw new BusinessException(
          '4030',
          'Only system owner or admin can update product',
        );
      }
      const getProduct = await this.productsRepository.getProductBySku(sku);
      if (!getProduct) {
        throw new BusinessException('4040', 'Product not found');
      }

      const isUpdated = await this.productsRepository.updateProductBySku(
        sku,
        updateData,
        authUser,
      );
      if (!isUpdated) {
        throw new BusinessException('4040', 'Failed to update product');
      }
    } catch (error) {
      console.error(
        `Error updating product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getListProducts(query: getProductListDto, sortBy: SortCriterial) {
    try {
      const { page, limit, skip } = getPagination(query);
      const result = await this.productsRepository.getListProducts(
        { page, limit, skip },
        query,
        sortBy,
      );
      console.log(result)
      return result;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getProductDetail(sku: string): Promise<IProductDetailResponse> {
    try {
      const product = await this.productsRepository.getProductBySku(sku);

      if (!product) {
        throw new BusinessException('4040', 'Product not found');
      }
      const stock = await this.stockManagementService.getStockDetail(
        product.id,
      );

      return {
        product: {
          ...product,
        },
        stockInfo: stock
          ? {
              ...stock,
              id: stock.id?.toString(),
            }
          : null,
      };
    } catch (error) {
      console.error(
        `Error getting product detail: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      throw error;
    }
  }

  private buildCreateStock(
    request: stockRequestDto,
    productId: string,
    sku: string,
  ): CreateStockDto {
    return {
      productId,
      sku,
      warehouseId: undefined,
      quantity: request.quantity,
      reserved: request.reserved,
      minStock: request.minStock,
    };
  }
}
