import { Controller, Get, Param } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AutoMinerService } from '../auto-miner/auto-miner.service';
import { SolutionStatsService } from '../solution/solution-stats.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly autoMinerService: AutoMinerService,
    private readonly solutionStats: SolutionStatsService,
  ) {}

  @Get()
  getAllWallets() {
    return this.walletsService.getAllWallets();
  }

  @Get('stats')
  getStats() {
    return this.walletsService.getStats();
  }

  @Get('mining-status')
  getMiningStatus() {
    const status = this.autoMinerService.getMiningStatus();
    const activeAddresses = Array.from(this.autoMinerService.getActiveAddressesSet());
    return {
      ...status,
      activeAddresses, // Lista de endereços minerando agora
    };
  }

  @Get('recent-activity')
  getRecentActivity() {
    return this.walletsService.getRecentActivity();
  }

  @Get('challenge-info')
  getChallengeInfo() {
    return this.autoMinerService.getChallengeInfo();
  }

  @Get('challenge-changed')
  async hasChallengeChanged() {
    const info = await this.autoMinerService.getChallengeInfo();
    return {
      changed: info.hasChanged,
      currentChallengeId: info.currentChallengeId,
      lastChallengeId: info.lastChallengeId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('challenge/:challengeId/solutions')
  getChallengeSolutions(@Param('challengeId') challengeId: string) {
    return this.walletsService.getChallengeSolutions(challengeId);
  }

  @Get('challenge/:challengeId/resolved')
  isChallengeResolved(@Param('challengeId') challengeId: string) {
    const isResolved = this.walletsService.isChallengeResolved(challengeId);
    const solutionCount = this.walletsService.getChallengeSolutions(challengeId).totalSolutions;
    
    return {
      challengeId,
      resolved: isResolved,
      solutionCount,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('challenges/stats')
  getAllChallengesStats() {
    return this.walletsService.getAllChallengesStats();
  }

  @Get('solutions/new')
  checkNewSolutions() {
    return this.solutionStats.checkForNewSolutions();
  }

  @Get('challenges/resolved')
  getResolvedChallenges() {
    return {
      resolvedChallenges: this.solutionStats.getResolvedChallenges(),
      count: this.solutionStats.getResolvedChallenges().length,
      timestamp: new Date().toISOString(),
    };
  }
}
