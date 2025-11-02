import { Controller, Get } from '@nestjs/common';
import { WorkRateService } from './work-rate.service';

@Controller()
export class WorkRateController {
  constructor(private readonly workRateService: WorkRateService) {}

  @Get('work_to_star_rate')
  getWorkToStarRate() {
    return this.workRateService.getWorkToStarRate();
  }
}

