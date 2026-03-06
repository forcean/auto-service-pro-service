import { Inject, Injectable } from "@nestjs/common";
import { createProductDto, getProductCategoriesDto } from "./products.dto";
import { BusinessException } from "src/common/exceptions/business.exception";
import { ProductsRepository } from "src/repository/products/products.repository";
import { AuthUser } from "src/types/user.type";
import { ProductCategoriesRepository } from "src/repository/product-category/product-category.repository";
import { ProductBrandsRepository } from "src/repository/product-brands/product-brands.repository";
import { VehiclesRepository } from "src/repository/vehicles/vehicles.repository";
import { SkuCountersRepository } from "src/repository/sku-counters/sku-counters.repository";
import { VehicleBrandsRepository } from "src/repository/vehicle-brands/vehicle-brands.repository";
import { VehicleModelsRepository } from "src/repository/vehicle-models/vehicle-models.repository";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(ProductsRepository) private readonly productsRepository: ProductsRepository,
    @Inject(ProductCategoriesRepository) private readonly productCategoriesRepository: ProductCategoriesRepository,
    @Inject(ProductBrandsRepository) private readonly productBrandsRepository: ProductBrandsRepository,
    @Inject(VehiclesRepository) private readonly vehiclesRepository: VehiclesRepository,
    @Inject(SkuCountersRepository) private readonly skuCountersRepository: SkuCountersRepository,
    @Inject(VehicleBrandsRepository) private readonly vehicleBrandsRepository: VehicleBrandsRepository,
    @Inject(VehicleModelsRepository) private readonly vehicleModelsRepository: VehicleModelsRepository,
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

      const tree = await this.buildTree(getCategories);
      return tree;
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
      return {
        brands: getBrands.map(data => ({
          id: data._id,
          name: data.name,
          slug: data.slug,
          code: data.code,
          country: data.country,
          logoUrl: data.logo?.url
        }))
      };
    } catch (error) {
      console.error(`Error getting product brands: ${error.message}`);
      throw error;
    }
  }

  async getVehiclesBrand(isActive: boolean) {
    try {
      const getVehiclesBrand = await this.vehicleBrandsRepository.getVehicleBrands(isActive);
      if (!getVehiclesBrand) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      const brand = getVehiclesBrand.map(data => ({
        brand: data.brand,
        brandCode: data.brandCode
      }))
      return brand;
    } catch (error) {
      console.error(`Error getting product vehicles by brand: ${error.message}`);
      throw error;
    }
  }

  async getVehicleModelsByBrand(brandCode: string, isActive: boolean) {
    try {
      const getVehicleModels = await this.vehicleModelsRepository.getModelsByBrand(brandCode, isActive);
      if (!getVehicleModels) {
        throw new BusinessException('4042', 'No product vehicles found');
      }

      const model = getVehicleModels.map(data => ({
        model: data.model,
        modelCode: data.modelCode,
        generation: data.generation
      }))
      return model;
    } catch (error) {
      console.error(`Error getting product vehicles by brand: ${error.message}`);
      throw error;
    }
  }

  async getVehicles(brand: string, model: string, generation: string, isActive?: boolean) {
    try {
      const getVehicles = await this.vehiclesRepository.getVehicles(brand, model, generation, isActive);

      if (!getVehicles) {
        throw new BusinessException('4042', 'No product vehicles found');
      }
      return getVehicles;
    } catch (error) {
      console.error(`Error getting product vehicles: ${error.message}`);
      throw error;
    }
  }

  private async buildTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    categories.forEach(cat => {
      map.set(cat._id.toString(), { ...cat, children: [] });
    });

    categories.forEach(cat => {
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
}