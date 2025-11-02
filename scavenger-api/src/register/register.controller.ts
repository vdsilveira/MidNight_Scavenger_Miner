import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { RegisterService } from './register.service';

@Controller()
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register/:address/:signature/:pubkey')
  async register(
    @Param('address') address: string,
    @Param('signature') signature: string,
    @Param('pubkey') pubkey: string,
  ) {
    try {
      return await this.registerService.register(address, signature, pubkey);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message || 'Registration failed',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

