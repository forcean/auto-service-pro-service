import { Inject, Injectable } from "@nestjs/common";
import { createProductDto, getProductCategoriesDto } from "./products.dto";
import { BusinessException } from "src/common/exceptions/business.exception";
import { ProductsRepository } from "src/repository/products/products.repository";
import { AuthUser } from "src/types/user.type";
import { ProductCategoriesRepository } from "src/repository/product-category/product-category.repository";
import { ProductBrandsRepository } from "src/repository/product-brands/product-brands.repository";
import { VehiclesRepository } from "src/repository/vehicles/vehicles.repository";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(ProductsRepository) private readonly productsRepository: ProductsRepository,
    @Inject(ProductCategoriesRepository) private readonly productCategoriesRepository: ProductCategoriesRepository,
    @Inject(ProductBrandsRepository) private readonly productBrandsRepository: ProductBrandsRepository,
    @Inject(VehiclesRepository) private readonly vehiclesRepository: VehiclesRepository,
  ) { }

  async createProduct(dto: createProductDto, authUser: AuthUser) {
    try {

      if (authUser.role !== 'ADM' && authUser.role !== 'SO') {
        throw new BusinessException('4030', 'Only system owner or admin can create product');
      }

      const isProductExist = await this.productsRepository.getProductBySku(dto.sku);
      if (isProductExist) {
        throw new BusinessException('4091', 'Product with the same SKU already exists');
      }

      const createProduct = await this.productsRepository.createProduct(dto, authUser.id);

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
      return getCategories.map(category => ({
        id: category._id,
        name: category.name,
        slug: category.slug,
        code: category.code,
        level: category.level,
        parentId: category.parentId,
        path: category.path,
        isSelectable: category.isSelectable,
        sortOrder: category.sortOrder,
        allowVehicleBinding: category.allowVehicleBinding,
        allowStock: category.allowStock,
        isActive: category.isActive,
        isDeleted: category.isDeleted,
      }));
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