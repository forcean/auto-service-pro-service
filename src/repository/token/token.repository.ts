import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TokenEntity } from './token.schema';
import { refreshTokenDto } from 'src/routes/auth/token.dto';
import { promises } from 'dns';


@Injectable()
export class TokenRepository {

  constructor(
    @InjectModel(TokenEntity.name, 'autoservice') private readonly tokenEntity: Model<TokenEntity>,
  ) { }

  async insertToken(tokenEntity: TokenEntity): Promise<TokenEntity> {
    return await this.tokenEntity.create(tokenEntity);
  }

  async getToken(refreshTokenDto: refreshTokenDto, publicId: string): Promise<TokenEntity | null> {
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