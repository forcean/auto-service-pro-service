import { Inject, Injectable } from "@nestjs/common";
import { createProductDto, getProductCategoriesDto } from "./products.dto";
import { BusinessException } from "src/common/exceptions/business.exception";
import { ProductsRepository } from "src/repository/products/products.repository";
import { AuthUser } from "src/types/user.type";
import { ProductCategoriesRepository } from "src/repository/product-category/product-category.repository";
import { ProductBrandsRepository } from "src/repository/product-brands/product-brands.repository";
import { VehiclesRepository } from "src/repository/vehicles/vehicles.repository";
import { SkuCountersRepository } from "src/repository/sku-counters/sku-counters.repository";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(ProductsRepository) private readonly productsRepository: ProductsRepository,
    @Inject(ProductCategoriesRepository) private readonly productCategoriesRepository: ProductCategoriesRepository,
    @Inject(ProductBrandsRepository) private readonly productBrandsRepository: ProductBrandsRepository,
    @Inject(VehiclesRepository) private readonly vehiclesRepository: VehiclesRepository,
    @Inject(SkuCountersRepository) private readonly skuCountersRepository: SkuCountersRepository,
  ) { }

  async createProduct(dto: createProductDto, authUser: AuthUser) {
    try {

      if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
        throw new BusinessException('4030', 'Only system owner or admin can create product');
      }

      const categoryCode = await this.productCategoriesRepository.getCategoryById(dto.categoryId);

      if (!categoryCode) {
        throw new BusinessException('4040', 'Product category not found');
      }

      const brandCode = await this.productBrandsRepository.getBrandById(dto.brandId);

      if (!brandCode) {
        throw new BusinessException('4041', 'Product brand not found');
      }

      const segments: string[] = [];

      segments.push(categoryCode.code);
      segments.push(brandCode.code);

      if (dto.vehicles.length === 1) {
        const vehicleCode = await this.vehiclesRepository.getVehicleById(dto.vehicles[0].vehicleId); //พังบรรทัดนี้
        if (!vehicleCode) {
          throw new BusinessException('4042', 'Product vehicle not found');
        }
        segments.push(vehicleCode.modelCode);
        segments.push(vehicleCode.brandCode);
      }

      const prefix = segments.join('-');
      const runningNumber = await this.skuCountersRepository.getNextSequence(prefix);
      const sku = `${prefix}-${runningNumber.toString().padStart(3, '0')}`;

      const isProductExist = await this.productsRepository.getProductBySku(sku);
      if (isProductExist) {
        throw new BusinessException('4091', 'Product with the same SKU already exists');
      }

      const createProduct = await this.productsRepository.createProduct(sku, dto, authUser.id);

      if (!createProduct) {
        throw new BusinessException('4012', 'Failed to create product');
      }
    }
    catch (error) {
      console.error(`Error creating product: ${error.message}`);
      throw error;
    }
  }

  async getProductCategories(dto: getProductCategoriesDto) {
    try {
      const getCategories = await this.productCategoriesRepository.getProductCategories(dto);

      if (!getCategories) {
        throw new BusinessException('4040', 'No product categories found');
      }
      return getCategories;
    } catch (error) {
      console.error(`Error getting product categories: ${error.message}`);
      throw error;
    }
  }

  async getProductBrands(isActive: boolean) {
    try {
      const getBrands = await this.productBrandsRepository.getProductBrands(isActive);

      if (!getBrands) {
        throw new BusinessException('4041', 'No product brands found');
      }
      return getBrands;
    } catch (error) {
      console.error(`Error getting product brands: ${error.message}`);
      throw error;
    }
  }

  async getVehicles(isActive: boolean) {
    try {
      const getVehicles = await this.vehiclesRepository.getVehicles(isActive);

      if (!getVehicles) {
        throw new BusinessException('4042', 'No product vehicles found');
      }
      return getVehicles;
    } catch (error) {
      console.error(`Error getting product vehicles: ${error.message}`);
      throw error;
    }
  }
}