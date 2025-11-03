import { Injectable } from '@nestjs/common';
import { LoginDto } from './login.dto';

@Injectable()
export class LoginService {

  async loginByEmail(loginDto: LoginDto) {
    try {

    }catch (error) {
      throw error;
    }
  }
}