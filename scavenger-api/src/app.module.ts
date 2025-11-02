import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TermsController } from './terms/terms.controller';
import { TermsService } from './terms/terms.service';
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';
import { ChallengeController } from './challenge/challenge.controller';
import { ChallengeService } from './challenge/challenge.service';
import { SolutionController } from './solution/solution.controller';
import { SolutionService } from './solution/solution.service';
import { DonateController } from './donate/donate.controller';
import { DonateService } from './donate/donate.service';
import { WorkRateController } from './work-rate/work-rate.controller';
import { WorkRateService } from './work-rate/work-rate.service';
import { StorageService } from './storage/storage.service';
import { WalletsController } from './wallets/wallets.controller';
import { WalletsService } from './wallets/wallets.service';
import { AshmaizeService } from './ashmaize/ashmaize.service';
import { AshmaizeNativeService } from './ashmaize/ashmaize-native.service';
import { AshmaizeWasmService } from './ashmaize/ashmaize-wasm.service';
import { CardanoService } from './cardano/cardano.service';
import { ConfigModule } from '@nestjs/config';
import { CardanoDerivationService } from './cardano-derivation/cardano-derivation.service';
import { AutoMinerService } from './auto-miner/auto-miner.service';
import { ConsolidationController } from './consolidation/consolidation.controller';
import { ConsolidationService } from './consolidation/consolidation.service';
import { ChallengeMonitorService } from './challenge/challenge-monitor.service';
import { SolutionStatsService } from './solution/solution-stats.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
  ],
  controllers: [
    AppController,
    TermsController,
    RegisterController,
    ChallengeController,
    SolutionController,
    DonateController,
    WorkRateController,
    WalletsController,
    ConsolidationController,
  ],
  providers: [
    AppService,
    TermsService,
    RegisterService,
    ChallengeService,
    SolutionService,
    DonateService,
    WorkRateService,
    StorageService,
    AshmaizeWasmService,
    AshmaizeNativeService,
    AshmaizeService,
    CardanoService,
    WalletsService,
    CardanoDerivationService,
    AutoMinerService,
    ConsolidationService,
    ChallengeMonitorService,
    SolutionStatsService,
  ],
})
export class AppModule {}
