import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VehiclesService as VehiclesService } from './services/vehicles.service';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import type { Request } from 'express';
import { BusinessException } from 'src/common/exceptions/business.exception';
import {
  customerVehicleDto,
  getVehiclesDto,
  getVehiclesWithPaginationDto,
  updateCustomerVehicleDto,
  vehiclesDto,
} from './dtos/vehicles.dto';
import { CustomersVehicleService } from './services/customers-vehicle.service';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly customersVehicleService: CustomersVehicleService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create-vehicle')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create vehicle successful')
  async createVehicle(@Body() data: vehiclesDto, @Req() { authUser }: Request) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }
    await this.vehiclesService.createVehicle(data, authUser);
  }

  @Get('/details')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get vehicle detail successful')
  async getVehicleDetail(
    @Query() query: getVehiclesDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.vehiclesService.getVehicleDetail(query);
  }

  @Post('customer')
  @UseGuards(PermissionsGuard)
  @Permissions('create:customer-vehicle')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Created customer vehicles successful')
  async createCustomerVehicle(
    @Body() dto: customerVehicleDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    await this.customersVehicleService.createCustomersVehicle(dto, authUser);
  }

  @Get('customer/:province/:licensePlate/detail')
  @UseGuards(PermissionsGuard)
  @Permissions()
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get customer vehicle successful')
  async getCustomerVehicles(
    @Param('licensePlate') licensePlate: string,
    @Param('province') province: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.customersVehicleService.getCustomerVehicleByLicensePlate(
      licensePlate,
      province,
    );
  }

  @Patch('customer/:province/:licensePlate')
  @UseGuards(PermissionsGuard)
  @Permissions('update:customer-vehicle')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Updated customer vehicle successful')
  async updateCustomerVehicle(
    @Body() dto: updateCustomerVehicleDto,
    @Param('licensePlate') licensePlate: string,
    @Param('province') province: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.customersVehicleService.updateCustomerVehicleByLicensePlate(
      authUser,
      dto,
      licensePlate,
      province,
    );
  }

  @Post('customer/:province/:licensePlate')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:customer-vehicle')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Deleted customer vehicle successful')
  async deleteCustomerVehicle(
    @Param('licensePlate') licensePlate: string,
    @Param('province') province: string,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.customersVehicleService.deleteCustomerVehicleByLicensePlate(
      authUser,
      licensePlate,
      province
    );
  }

  @Get('customer')
  @UseGuards(PermissionsGuard)
  @Permissions('view:customer-vehicle')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Created customer vehicles successful')
  async getVehiclesWithPagination(
    @Query() query: getVehiclesWithPaginationDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return await this.customersVehicleService.getVehiclesWithPagination(
      query,
      sortBy,
    );
  }
}
