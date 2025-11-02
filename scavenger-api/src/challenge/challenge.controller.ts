import { Controller, Get } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeMonitorService } from './challenge-monitor.service';

@Controller()
export class ChallengeController {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly challengeMonitor: ChallengeMonitorService,
  ) {}

  @Get('challenge/current')
  getChallenge() {
    return this.challengeService.getCurrentChallenge();
  }

  @Get('challenge/status')
  getChallengeStatus() {
    return this.challengeMonitor.getChallengeStatus();
  }
}

