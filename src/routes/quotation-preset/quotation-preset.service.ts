import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ProductsRepository } from 'src/repository/products/products.repository';
import { QuotationPresetRepository } from 'src/repository/quotation-preset/quotation-preset.repository';
import { AuthUser } from 'src/types/user.type';
import {
  CreateQuotationPresetDto,
  GetQuotationPresetDto,
  QuotationPresetItemDto,
  UpdateQuotationPresetDto,
} from './dtos/quotation-preset.dto';

@Injectable()
export class QuotationPresetService {
  constructor(
    @Inject(QuotationPresetRepository)
    private readonly quotationPresetRepository: QuotationPresetRepository,
    @Inject(ProductsRepository)
    private readonly productsRepository: ProductsRepository,
  ) {}

  async getAll(query: GetQuotationPresetDto) {
    const rawIsActive = query.isActive as unknown;
    let isActive: boolean | undefined;

    if (rawIsActive === undefined || rawIsActive === null || rawIsActive === '') {
      isActive = undefined;
    } else if (typeof rawIsActive === 'boolean') {
      isActive = rawIsActive;
    } else if (typeof rawIsActive === 'string') {
      if (rawIsActive === 'true') {
        isActive = true;
      } else if (rawIsActive === 'false') {
        isActive = false;
      } else {
        throw new BusinessException('4000', 'Invalid isActive query parameter');
      }
    } else {
      throw new BusinessException('4000', 'Invalid isActive query parameter');
    }

    const presets = await this.quotationPresetRepository.findAll(isActive);
    return presets.map((preset) => this.toResponse(preset));
  }

  async create(dto: CreateQuotationPresetDto, user: AuthUser) {
    const items = await this.buildItems(dto.items);
    const preset = await this.quotationPresetRepository.create(
      {
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        items,
        isActive: dto.isActive ?? true,
      },
      user,
    );

    return this.toResponse(preset);
  }

  async update(
    presetId: string,
    dto: UpdateQuotationPresetDto,
    user: AuthUser,
  ) {
    const existing = await this.quotationPresetRepository.findById(presetId);
    if (!existing) {
      throw new BusinessException('4040', 'Quotation preset not found');
    }

    const preset = await this.quotationPresetRepository.update(
      presetId,
      {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || undefined }
          : {}),
        ...(dto.items ? { items: await this.buildItems(dto.items) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      user,
    );

    if (!preset) {
      throw new BusinessException('5003', 'Failed to update quotation preset');
    }

    return this.toResponse(preset);
  }

  private async buildItems(items: QuotationPresetItemDto[]) {
    const uniqueSkus = new Set<string>();
    const result: Array<{
      productId: string;
      sku: string;
      description: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const sku = item.sku.trim();
      if (uniqueSkus.has(sku)) {
        throw new BusinessException('4001', 'A product can be added only once per preset');
      }
      uniqueSkus.add(sku);

      const product = await this.productsRepository.getProductBySku(sku);
      if (!product || product.isDeleted || product.id !== item.productId) {
        throw new BusinessException('4040', `Product ${sku} not found`);
      }

      result.push({
        productId: product.id,
        sku: product.sku,
        description: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price?.retail ?? 0),
      });
    }

    return result;
  }

  private toResponse(preset: any) {
    return {
      ...preset,
      id: String(preset._id ?? preset.id),
      items: (preset.items ?? []).map((item: any) => ({
        ...item,
        productId: String(item.productId),
      })),
    };
  }
}
