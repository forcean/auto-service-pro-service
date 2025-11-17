import { Module, Provider } from "@nestjs/common";
import { UsersEntity, UsersSchema } from "./users/users.schema";
import { UsersRepository } from "./users/users.repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModelDefinition, MongooseModule, getModelToken } from "@nestjs/mongoose";
import { TokenRepository } from "./token/token.repository";
import { TokenEntity, TokenSchema } from "./token/token.schema";


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
      { name: TokenEntity.name, schema: TokenSchema }
    ], 
    'autoservice')
  ],
  providers: [UsersRepository, TokenRepository],
  exports: [UsersRepository, TokenRepository],
})

export class RepositoryModule { }