import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TokenEntity } from './token.schema';
import { refreshTokenDto } from 'src/routes/auth/dtos/token.dto';
import { ITokenRecord } from 'src/routes/auth/interface/token.interface';


@Injectable()
export class TokenRepository {

  constructor(
    @InjectModel(TokenEntity.name, 'autoservice') private readonly tokenEntity: Model<TokenEntity>,
  ) { }

  async insertToken(tokenEntity: TokenEntity): Promise<ITokenRecord> {
    return await this.tokenEntity.create(tokenEntity);
  }

  async getToken(refreshTokenDto: refreshTokenDto, publicId: string): Promise<ITokenRecord | null> {
    const query: FilterQuery<TokenEntity> = {
      publicId: publicId,
      accessToken: refreshTokenDto.accessToken,
      refreshToken: refreshTokenDto.refreshToken
    };
    return await this.tokenEntity.findOne(query);
  }

  async deleteOldToken(publicId: string, oldAccessToken: string, refreshToken: string): Promise<boolean> {
    const delOldToken = await this.tokenEntity.deleteOne({ publicId, accessToken: oldAccessToken, refreshToken });
    return delOldToken ? true : false;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.tokenEntity.deleteOne({ accessToken: token });
  }
}