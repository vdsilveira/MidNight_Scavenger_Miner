import { Controller, Get, Param } from '@nestjs/common';
import { TermsService } from './terms.service';

@Controller()
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get('TandC')
  getTermsAndConditions() {
    return this.termsService.getTermsAndConditions();
  }

  @Get('TandC/:version')
  getTermsAndConditionsVersioned(@Param('version') version: string) {
    return this.termsService.getTermsAndConditionsByVersion(version);
  }
}

