import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import {
  createProductDto,
  getProductCategoriesDto,
  getProductListDto,
  updateProductDto,
} from './products.dto';
import type { Request } from 'express';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { getUserWithPaginationDto } from '../user-management/dtos/user-manage.dto';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Controller('products')
export class ProductsController {
  constructor(readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:product')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create product successful')
  async createProduct(
    @Body() createProductDto: createProductDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.productsService.createProduct(createProductDto, authUser);
  }

  @Post(':skuId/delete')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:product')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Delete product successful')
  async deleteProduct(
    @Param('skuId') skuId: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    await this.productsService.deleteProduct(skuId, authUser);
    // return {
    //   message: 'Delete product successful',
    // };
  }

  @Get('categories')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product categories successful')
  async getProductCategories(
    @Query() queryDto: getProductCategoriesDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getProductCategories(queryDto);
  }

  @Get('brands')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product brands successful')
  async getProductBrands(
    @Query('isActive') isActive: boolean,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getProductBrands(isActive);
  }

  @Get('vehicles/brands')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product vehicle brands successful')
  async getVehicleBrands(
    @Query('isActive') isActive: boolean,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getVehicleBrands(isActive);
  }

  @Get('vehicles/:brandCode/models')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product vehicle models successful')
  async getVehicleModelsByBrand(
    @Query('isActive') isActive: boolean,
    @Param('brandCode') brandCode: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getVehicleModelsByBrand(
      brandCode,
      isActive,
    );
  }

  @Patch('update/:sku')
  @UseGuards(PermissionsGuard)
  @Permissions('update:product')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update product successful')
  async updateProductBySku(
    @Param('sku') sku: string,
    @Body() updateData: updateProductDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.productsService.updateProductBySku(sku, updateData, authUser);
  }

  @Get('listProducts')
  @UseGuards(PermissionsGuard)
  @Permissions('view:list-products')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get list products successful')
  async getProducts(
    @Query() dto: getProductListDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
    @Req() { authUser }: Request,
    // @Query() pagination: PaginationQuery,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getListProducts(dto, sortBy);
  }

  @Get(':sku/detail')
  @UseGuards(PermissionsGuard)
  @Permissions('view:product-detail')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product detail successful')
  async getProductDetail(
    @Param('sku') sku: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    return await this.productsService.getProductDetail(sku);
  }
}
