import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DonateService } from './donate.service';

@Controller()
export class DonateController {
  constructor(private readonly donateService: DonateService) {}

  @Post('donate_to/:destination_address/:original_address/:signature')
  async donate(
    @Param('destination_address') destinationAddress: string,
    @Param('original_address') originalAddress: string,
    @Param('signature') signature: string,
  ) {
    try {
      return await this.donateService.donate(
        destinationAddress,
        originalAddress,
        signature,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message || 'Donation failed',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

