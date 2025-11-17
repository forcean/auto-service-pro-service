import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'token' })
export class TokenEntity {
  @Prop({ type: String })
  publicId: string;

  @Prop({ type: String })
  accessToken: string;

  @Prop({ type: Date })
  accessTokenExpiresDt: Date;

  @Prop({ type: Date })
  loginDt: Date;

  @Prop({ type: String })
  refreshToken: string;

  @Prop({ type: Date })
  refreshTokenExpiresDt: Date;

  @Prop({ type: Boolean })
  refreshFlag: boolean;
}

export const TokenSchema = SchemaFactory.createForClass(TokenEntity);