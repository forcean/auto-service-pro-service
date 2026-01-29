import { Module, Provider } from "@nestjs/common";
import { UsersEntity, UsersSchema } from "./users/users.schema";
import { UsersRepository } from "./users/users.repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModelDefinition, MongooseModule, getModelToken } from "@nestjs/mongoose";
import { TokenRepository } from "./token/token.repository";
import { TokenEntity, TokenSchema } from "./token/token.schema";
import { PoliciesEntity, PoliciesSchema,  } from "./permissions/policies.schema";
import { PoliciesRepository } from "./permissions/policies.repository";
import { MenuEntity, MenuSchema } from "./menus/menus.schema";
import { MenuRepository } from "./menus/menus.repository";
import { ProductsEntity, ProductsSchema } from "./products/products.schema";
import { ProductsRepository } from "./products/products.repository";
import { ProductBrandsEntity, ProductBrandsSchema } from "./product-brands/product-brands.schema";
import { ProductBrandsRepository } from "./product-brands/product-brands.repository";
import { ProductCategoriesEntity, ProductCategoriesSchema } from "./product-category/product-category.schema";
import { ProductCategoriesRepository } from "./product-category/product-category.repository";
import { VehiclesEntity, VehiclesSchema } from "./vehicles/vehicles.schema";
import { VehiclesRepository } from "./vehicles/vehicles.repository";


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
  imports: [MongooseModule.forFeature(
    [
      { name: UsersEntity.name, schema: UsersSchema },
      { name: TokenEntity.name, schema: TokenSchema },
      { name: PoliciesEntity.name, schema: PoliciesSchema },
      { name: MenuEntity.name, schema: MenuSchema },
      { name: ProductsEntity.name, schema: ProductsSchema },
      { name: ProductBrandsEntity.name, schema: ProductBrandsSchema },
      { name: ProductCategoriesEntity.name, schema: ProductCategoriesSchema },
      { name: VehiclesEntity.name, schema: VehiclesSchema }
    ], 
    'autoservice')
  ],
  providers: [UsersRepository, TokenRepository, PoliciesRepository, MenuRepository, ProductsRepository, ProductBrandsRepository, ProductCategoriesRepository, VehiclesRepository],
  exports: [UsersRepository, TokenRepository, PoliciesRepository, MenuRepository, ProductsRepository, ProductBrandsRepository, ProductCategoriesRepository, VehiclesRepository],
})

export class RepositoryModule { }