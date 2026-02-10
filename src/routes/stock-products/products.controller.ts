import { Body, Controller, Get, Post, Query, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { PermissionsGuard } from "src/common/permission/permission.guard";
import { Permissions } from "src/common/permission/permission.decorator";
import { ResponseInterceptor } from "src/common/response/response.interceptor";
import { ResponseMessage, ResponseResultCode } from "src/common/response/response.decorator";
import { createProductDto, getProductCategoriesDto } from "./products.dto";
import type { Request } from 'express';
import { BusinessException } from "src/common/exceptions/business.exception";

@Controller('products')
export class ProductsController {
  constructor(
    readonly productsService: ProductsService,
  ) { }

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

  @Get('vehicles')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get product vehicles successful')
  async getVehicles(
    @Query('isActive') isActive: boolean,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.productsService.getVehicles(isActive);
  }
}