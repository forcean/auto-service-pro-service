import { Module, Provider } from '@nestjs/common';
import { UsersEntity, UsersSchema } from './users/users.schema';
import { UsersRepository } from './users/users.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ModelDefinition,
  MongooseModule,
  getModelToken,
} from '@nestjs/mongoose';
import { TokenRepository } from './token/token.repository';
import { TokenEntity, TokenSchema } from './token/token.schema';
import { PoliciesEntity, PoliciesSchema } from './permissions/policies.schema';
import { PoliciesRepository } from './permissions/policies.repository';
import { MenuEntity, MenuSchema } from './menus/menus.schema';
import { MenuRepository } from './menus/menus.repository';
import { ProductsEntity, ProductsSchema } from './products/products.schema';
import { ProductsRepository } from './products/products.repository';
import {
  ProductBrandsEntity,
  ProductBrandsSchema,
} from './product-brands/product-brands.schema';
import { ProductBrandsRepository } from './product-brands/product-brands.repository';
import {
  ProductCategoriesEntity,
  ProductCategoriesSchema,
} from './product-category/product-category.schema';
import { ProductCategoriesRepository } from './product-category/product-category.repository';
import { VehiclesEntity, VehiclesSchema } from './vehicles/vehicles.schema';
import { VehiclesRepository } from './vehicles/vehicles.repository';
import {
  SkuCountersEntity,
  SkuCountersSchema,
} from './sku-counters/sku-counters.schema';
import { SkuCountersRepository } from './sku-counters/sku-counters.repository';
import {
  VehicleBrandsEntity,
  VehicleBrandsSchema,
} from './vehicle-brands/vehicle-brands.schema';
import { VehicleBrandsRepository } from './vehicle-brands/vehicle-brands.repository';
import {
  VehicleModelsEntity,
  VehicleModelsSchema,
} from './vehicle-models/vehicle-models.schema';
import { VehicleModelsRepository } from './vehicle-models/vehicle-models.repository';
import { CustomersVehicleRepository } from './customers-vehicle/customers-vehicle.repository';
import { CustomersVehicleEntity, CustomersVehicleSchema } from './customers-vehicle/customers-vehicle.schema';
// const reposytories = [UsersRepository];
// const entities = [
//   { entity: UsersEntity, schema: UsersSchema, connection: "autoservice" }
// ];

// const models: ModelDefinition[] = entities.map((entity) => ({
//   name: entity.entity.name,
//   schema: entity.schema,
//   connection: entity.connection,
// }));

// const modelProviders: Provider[] = models.map((model) => ({
//   provide: model.name,
//   inject: [getModelToken(model.name, "autoservice")],
//   useFactory: (modelInstance) => modelInstance,
// }));

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: UsersEntity.name, schema: UsersSchema },
        { name: TokenEntity.name, schema: TokenSchema },
        { name: PoliciesEntity.name, schema: PoliciesSchema },
        { name: MenuEntity.name, schema: MenuSchema },
        { name: ProductsEntity.name, schema: ProductsSchema },
        { name: ProductBrandsEntity.name, schema: ProductBrandsSchema },
        { name: ProductCategoriesEntity.name, schema: ProductCategoriesSchema },
        { name: VehiclesEntity.name, schema: VehiclesSchema },
        { name: SkuCountersEntity.name, schema: SkuCountersSchema },
        { name: VehicleBrandsEntity.name, schema: VehicleBrandsSchema },
        { name: VehicleModelsEntity.name, schema: VehicleModelsSchema },
        {
          name: CustomersVehicleEntity.name,
          schema: CustomersVehicleSchema,
        },
      ],
      'autoservice',
    ),
  ],
  providers: [
    UsersRepository,
    TokenRepository,
    PoliciesRepository,
    MenuRepository,
    ProductsRepository,
    ProductBrandsRepository,
    ProductCategoriesRepository,
    VehiclesRepository,
    SkuCountersRepository,
    VehicleBrandsRepository,
    VehicleModelsRepository,
    CustomersVehicleRepository,
  ],
  exports: [
    UsersRepository,
    TokenRepository,
    PoliciesRepository,
    MenuRepository,
    ProductsRepository,
    ProductBrandsRepository,
    ProductCategoriesRepository,
    VehiclesRepository,
    SkuCountersRepository,
    VehicleBrandsRepository,
    VehicleModelsRepository,
    CustomersVehicleRepository,
  ],
})
export class RepositoryModule {}
