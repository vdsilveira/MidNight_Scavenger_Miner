import { Controller, Get } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeMonitorService } from './challenge-monitor.service';

@Controller()
export class ChallengeController {
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly challengeMonitor: ChallengeMonitorService,
  ) {}

  // ✅ Rota principal conforme documentação Midnight: GET /challenge
  @Get('challenge')
  getChallenge() {
    return this.challengeService.getCurrentChallenge();
  }

  // ✅ Rota adicional para compatibilidade (mantida para frontend)
  @Get('challenge/current')
  getChallengeCurrent() {
    return this.challengeService.getCurrentChallenge();
  }

  @Get('challenge/status')
  getChallengeStatus() {
    return this.challengeMonitor.getChallengeStatus();
  }
}

