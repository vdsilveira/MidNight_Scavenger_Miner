import { Controller, Get } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AutoMinerService } from '../auto-miner/auto-miner.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly autoMinerService: AutoMinerService,
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
}
