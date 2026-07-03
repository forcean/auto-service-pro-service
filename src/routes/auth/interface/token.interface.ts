export interface IAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresDt: string;
  refreshTokenExpiresDt: string;
}


export interface ITokenRecord {
  publicId: string;
  accessToken: string;
  accessTokenExpiresDt: Date;
  loginDt: Date;
  refreshToken: string;
  refreshTokenExpiresDt: Date;
  refreshFlag: boolean;
}