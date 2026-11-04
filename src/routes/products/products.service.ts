import { Inject, Injectable } from '@nestjs/common';
import {
  createProductBrandDto,
  createProductCategoryDto,
  createProductDto,
  stockRequestDto,
  getProductCategoriesDto,
  getProductListDto,
  reorderProductCategoriesDto,
  updateProductBrandDto,
  updateProductCategoryDto,
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
import {
  IProduct,
  IProductDetail,
  IProductDetailResponse,
} from './interfaces/products.interface';
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

  async createProductCategory(
    dto: createProductCategoryDto,
    authUser: AuthUser,
  ) {
    this.ensureCatalogAccess(authUser);

    const code = this.normalizeCode(dto.code);
    const duplicate = await this.productCategoriesRepository.getCategoryByCode(code);
    if (duplicate) {
      throw new BusinessException('4091', 'Product category code already exists');
    }

    const parent = dto.parentId
      ? await this.productCategoriesRepository.getCategoryById(dto.parentId)
      : null;
    if (dto.parentId && !parent) {
      throw new BusinessException('4040', 'Parent product category not found');
    }

    const parentId = parent?._id.toString() ?? null;
    const sortOrder = await this.productCategoriesRepository.getNextSortOrder(parentId);

    const category = await this.productCategoriesRepository.createCategory(
      {
        name: dto.name.trim(),
        code,
        slug: this.slugFromCode(code),
        parentId,
        level: parent ? parent.level + 1 : 0,
        path: parent ? [...(parent.path ?? []), parent._id.toString()] : [],
        sortOrder,
        isSelectable: dto.isSelectable ?? true,
        allowVehicleBinding: dto.allowVehicleBinding ?? false,
        allowStock: dto.allowStock ?? true,
        isActive: dto.isActive ?? true,
      },
      authUser,
    );

    return { id: category._id.toString() };
  }

  async updateProductCategory(
    categoryId: string,
    dto: updateProductCategoryDto,
    authUser: AuthUser,
  ) {
    this.ensureCatalogAccess(authUser);

    const category = await this.productCategoriesRepository.getCategoryById(categoryId);
    if (!category) {
      throw new BusinessException('4040', 'Product category not found');
    }

    const code = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (code && code !== category.code) {
      const duplicate = await this.productCategoriesRepository.getCategoryByCode(code);
      if (duplicate && duplicate._id.toString() !== categoryId) {
        throw new BusinessException('4091', 'Product category code already exists');
      }
    }

    const updated = await this.productCategoriesRepository.updateCategory(
      categoryId,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(code && { code, slug: this.slugFromCode(code) }),
        ...(dto.isSelectable !== undefined && { isSelectable: dto.isSelectable }),
        ...(dto.allowVehicleBinding !== undefined && {
          allowVehicleBinding: dto.allowVehicleBinding,
        }),
        ...(dto.allowStock !== undefined && { allowStock: dto.allowStock }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      authUser,
    );

    if (!updated) {
      throw new BusinessException('5001', 'Update product category failed');
    }

    return { success: true };
  }

  async reorderProductCategories(
    dto: reorderProductCategoriesDto,
    authUser: AuthUser,
  ) {
    this.ensureCatalogAccess(authUser);

    if (new Set(dto.categoryIds).size !== dto.categoryIds.length) {
      throw new BusinessException('4000', 'Category ids must be unique');
    }

    const categories = await this.productCategoriesRepository.getCategoriesByIds(
      dto.categoryIds,
    );
    if (categories.length !== dto.categoryIds.length) {
      throw new BusinessException('4040', 'One or more product categories not found');
    }

    const parentIds = new Set(
      categories.map((category) => category.parentId ?? '__root__'),
    );
    if (parentIds.size !== 1) {
      throw new BusinessException(
        '4000',
        'Product categories must have the same parent to reorder',
      );
    }

    await this.productCategoriesRepository.updateSortOrders(
      dto.categoryIds,
      authUser,
    );

    return { success: true };
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
          description: data.description,
          isActive: data.isActive,
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

  async createProductBrand(dto: createProductBrandDto, authUser: AuthUser) {
    this.ensureCatalogAccess(authUser);

    const code = this.normalizeCode(dto.code);
    const duplicate = await this.productBrandsRepository.getBrandByCode(code);
    if (duplicate) {
      throw new BusinessException('4091', 'Product brand code already exists');
    }

    const brand = await this.productBrandsRepository.createBrand(
      {
        name: dto.name.trim(),
        code,
        slug: this.slugFromCode(code),
        country: dto.country?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        isActive: dto.isActive ?? true,
      },
      authUser,
    );

    return { id: brand._id.toString() };
  }

  async updateProductBrand(
    brandId: string,
    dto: updateProductBrandDto,
    authUser: AuthUser,
  ) {
    this.ensureCatalogAccess(authUser);

    const brand = await this.productBrandsRepository.getBrandById(brandId);
    if (!brand) {
      throw new BusinessException('4041', 'Product brand not found');
    }

    const code = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (code && code !== brand.code) {
      const duplicate = await this.productBrandsRepository.getBrandByCode(code);
      if (duplicate && duplicate._id.toString() !== brandId) {
        throw new BusinessException('4091', 'Product brand code already exists');
      }
    }

    const updated = await this.productBrandsRepository.updateBrand(
      brandId,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(code && { code, slug: this.slugFromCode(code) }),
        ...(dto.country !== undefined && { country: dto.country.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      authUser,
    );

    if (!updated) {
      throw new BusinessException('5001', 'Update product brand failed');
    }

    return { success: true };
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

  private ensureCatalogAccess(authUser: AuthUser) {
    if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
      throw new BusinessException(
        '4030',
        'Only system owner or admin can manage product catalog',
      );
    }
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '-');
  }

  private slugFromCode(code: string) {
    return code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

      return {
        ...result,
        products: await Promise.all(
          result.products.map((product) =>
            this.enrichProduct(product),
          ),
        ),
      };
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
      const [stock, productDetail] = await Promise.all([
        this.stockManagementService.getStockDetail(product.id),
        this.enrichProduct(product),
      ]);
      const recentMovements =
        await this.stockManagementService.getMovementHistory(product.id);

      return {
        product: productDetail,
        stockInfo: stock
          ? {
              ...stock,
              id: stock.id?.toString(),
            }
          : null,
        recentMovements: recentMovements.map((movement) => ({
          id: movement._id.toString(),
          productId: movement.productId,
          sku: movement.sku,
          type: movement.movementType,
          quantity: movement.quantity,
          beforeQty: movement.beforeQty,
          afterQty: movement.afterQty,
          reference: movement.referenceId ?? movement.referenceType,
          createdBy: movement.createdBy,
          createdDt: movement.createdAt,
        })),
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

  private async enrichProduct(product: IProduct): Promise<IProductDetail> {
    const [category, brand, vehicleDetails] = await Promise.all([
      this.productCategoriesRepository.getCategoryById(product.categoryId),
      this.productBrandsRepository.getBrandById(product.brandId),
      Promise.all(
        (product.vehicles ?? []).map((vehicle) =>
          this.vehiclesRepository.getVehicleById(vehicle.vehicleId),
        ),
      ),
    ]);

    return {
      ...product,
      categoryName: category?.name ?? '',
      brandName: brand?.name ?? '',
      vehicles: (product.vehicles ?? []).map((vehicle, index) => {
        const vehicleDetail = vehicleDetails[index];

        return {
          ...vehicle,
          _id: vehicle.vehicleId,
          brand: vehicleDetail?.brand ?? '',
          brandCode: vehicleDetail?.brandCode ?? '',
          model: vehicleDetail?.model ?? '',
          modelCode: vehicleDetail?.modelCode ?? '',
          generation: vehicleDetail?.generation ?? '',
          platform: vehicleDetail?.platform ?? '',
          isActive: vehicleDetail?.isActive ?? false,
        };
      }),
    };
  }
}
