import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SolutionService } from './solution.service';

@Controller()
export class SolutionController {
  constructor(private readonly solutionService: SolutionService) {}

  @Post('solution/:address/:challenge_id/:nonce')
  async submitSolution(
    @Param('address') address: string,
    @Param('challenge_id') challengeId: string,
    @Param('nonce') nonce: string,
  ) {
    try {
      return await this.solutionService.submitSolution(address, challengeId, nonce);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message || 'Solution submission failed',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

