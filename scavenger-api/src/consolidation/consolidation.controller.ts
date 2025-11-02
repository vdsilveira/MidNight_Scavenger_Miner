import { Controller, Post } from '@nestjs/common';
import { ConsolidationService } from './consolidation.service';

@Controller('consolidation')
export class ConsolidationController {
  constructor(private readonly consolidationService: ConsolidationService) {}

  @Post('all-to-main')
  async consolidateAll() {
    const result = await this.consolidationService.consolidateAllToMain();
    return {
      message: 'Consolidação concluída',
      ...result,
    };
  }
}

