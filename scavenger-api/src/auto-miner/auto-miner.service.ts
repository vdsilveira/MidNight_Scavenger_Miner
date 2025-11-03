import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardanoDerivationService } from '../cardano-derivation/cardano-derivation.service';
import { StorageService } from '../storage/storage.service';
import { RegisterService } from '../register/register.service';
import { ChallengeService } from '../challenge/challenge.service';
import { AshmaizeWasmService } from '../ashmaize/ashmaize-wasm.service';
import { SolutionService } from '../solution/solution.service';
import { TermsService } from '../terms/terms.service';

interface PendingAddress {
  address: string;
  index: number;
}

@Injectable()
export class AutoMinerService implements OnModuleInit {
  private readonly logger = new Logger(AutoMinerService.name);

  private isMining = false;
  private miningWorkers: Map<string, NodeJS.Timeout> = new Map();
  private activeWorkers: Set<string> = new Set();
  private pendingAddresses: PendingAddress[] = [];
  private allAddresses: PendingAddress[] = [];
  private lastChallengeId: string | null = null;
  private lastNoPreMine: string | null = null;
  private challengeChangeCallbacks: Array<(oldId: string | null, newId: string) => void> = [];
  private isResetting = false;

  private readonly maxConcurrentWorkers: number;
  private readonly miningInterval: number;
  private readonly statsIntervalMs: number;
  private statsTimer: NodeJS.Timeout | null = null;
  private attemptsSinceLastLog = 0;
  private totalAttempts = 0;
  private totalValid = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly cardanoDerivation: CardanoDerivationService,
    private readonly storageService: StorageService,
    private readonly registerService: RegisterService,
    private readonly challengeService: ChallengeService,
    private readonly ashmaizeService: AshmaizeWasmService, // WASM Service
    private readonly solutionService: SolutionService,
    private readonly termsService: TermsService,
  ) {
    this.maxConcurrentWorkers = parseInt(
      this.configService.get<string>('MAX_CONCURRENT_WORKERS', '5')
    );
    this.miningInterval = parseInt(
      this.configService.get<string>('MINING_INTERVAL_MS', '10')
    );
    this.statsIntervalMs = parseInt(
      this.configService.get<string>('LOG_MINING_STATS_INTERVAL_MS', '60000')
    );

    this.logger.log(
      `⚙️  Configuração de mineração: ${this.maxConcurrentWorkers} workers simultâneos, ` +
      `intervalo de ${this.miningInterval}ms entre tentativas, ` +
      `logs a cada ${this.statsIntervalMs}ms`
    );
  }

  async onModuleInit() {
    const seedPhrase = this.configService.get<string>('SEED_PHRASE');
    const autoMine = this.configService.get<string>('AUTO_MINE', 'true');

    if (!seedPhrase) {
      this.logger.warn('SEED_PHRASE não configurada. Mineração automática desabilitada.');
      return;
    }
    if (autoMine === 'false') {
      this.logger.log('AUTO_MINE=false. Mineração automática desabilitada.');
      return;
    }

    this.logger.log('🚀 Iniciando mineração automática...');
    try {
      await this.startAutoMining(seedPhrase);
    } catch (error: any) {
      this.logger.error(`Erro ao iniciar mineração automática: ${error.message}`);
    }
  }

  async startAutoMining(seedPhrase: string, addressCount?: number) {
    const count = addressCount || parseInt(this.configService.get<string>('ADDRESS_COUNT', '50'));
    if (this.isMining) {
      this.logger.warn('Mineração já está em andamento');
      return;
    }

    this.isMining = true;
    this.logger.log(`📝 Derivando ${count} endereços...`);

    const addresses = await this.cardanoDerivation.deriveMultipleAddresses(seedPhrase, count, 0);
    this.logger.log(`✅ ${addresses.length} endereços derivados`);

    const terms = this.termsService.getTermsAndConditions();
    const message = terms.message;

    this.logger.log('📝 Registrando endereços...');
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      try {
        const signature = await this.cardanoDerivation.signMessage(message, seedPhrase, addr.account || i, 0);
        await this.registerService.register(addr.address, signature, addr.pubkey);
        this.logger.log(`✅ Endereço ${i + 1}/${addresses.length} registrado: ${addr.address.substring(0, 20)}...`);
        await this.delay(100);
      } catch (error: any) {
        if (error.message?.includes('already registered') || error.message?.includes('Conflict')) {
          this.logger.log(`⚠️  Endereço ${i + 1} já estava registrado`);
        } else {
          this.logger.error(`❌ Erro ao registrar endereço ${i + 1}: ${error.message}`);
        }
      }
    }

    this.logger.log('✅ Todos os endereços registrados!');
    this.logger.log('⛏️  Iniciando mineração...');
    await this.delay(2000);

    this.allAddresses = addresses.map(addr => ({
      address: addr.address,
      index: addr.index,
    }));
    this.pendingAddresses = [...this.allAddresses];

    this.logger.log(`🚀 Iniciando mineração com pool de ${this.maxConcurrentWorkers} workers simultâneos...`);
    this.startWorkerPool();
    // reinicializa fila e workers quando o desafio mudar
    this.challengeChangeCallbacks.push(() => {
      this.resetForNewChallenge();
    });
    this.startStatsLogger();
  }

  private startWorkerPool() {
    const processNext = async () => {
      if (!this.isMining) return;

      if (this.activeWorkers.size < this.maxConcurrentWorkers && this.pendingAddresses.length > 0) {
        const next = this.pendingAddresses.shift();
        if (next) {
          this.activeWorkers.add(next.address);
          this.startMiningForAddress(next.address, next.index);
        }
      }

      if (this.isMining && (this.pendingAddresses.length > 0 || this.activeWorkers.size < this.maxConcurrentWorkers)) {
        setTimeout(processNext, 500);
      }
    };

    const initialCount = Math.min(this.maxConcurrentWorkers, this.pendingAddresses.length);
    for (let i = 0; i < initialCount; i++) {
      setTimeout(() => processNext(), i * 200);
    }
    setTimeout(() => processNext(), initialCount * 200 + 500);
  }

  private resetForNewChallenge() {
    if (this.isResetting) return;
    this.isResetting = true;
    try {
      this.logger.log('🔁 Desafio mudou — resetando fila e workers para a ordem original de endereços');
      // parar timeouts ativos dos workers atuais
      this.miningWorkers.forEach(timeoutId => clearTimeout(timeoutId));
      this.miningWorkers.clear();
      this.activeWorkers.clear();
      // repovoar fila com ordem original
      this.pendingAddresses = [...this.allAddresses];
      // reiniciar o pool
      this.startWorkerPool();
    } finally {
      this.isResetting = false;
    }
  }

  private startMiningForAddress(address: string, index: number) {
    let nonceCounter = BigInt(81985529216486895);
    let isWorkerActive = true;

    const worker = async () => {
      if (!this.isMining || !isWorkerActive) return;

      try {
        const challenge = this.challengeService.getCurrentChallenge();
        if (challenge.code !== 'active' || !challenge.challenge) return;

        const challengeData = challenge.challenge;
        const challengeChanged = this.lastChallengeId !== challengeData.challenge_id || this.lastNoPreMine !== challengeData.no_pre_mine;
        if (challengeChanged) {
          const oldChallengeId = this.lastChallengeId;
          this.lastChallengeId = challengeData.challenge_id;
          this.lastNoPreMine = challengeData.no_pre_mine;

          this.challengeChangeCallbacks.forEach(cb => {
            try { cb(oldChallengeId, challengeData.challenge_id); } catch {}
          });
        }

        const currentTime = new Date();
        if (currentTime > new Date(challengeData.latest_submission)) {
          isWorkerActive = false;
          this.activeWorkers.delete(address);
          return;
        }

        if (this.storageService.getSolution(address, challengeData.challenge_id)) {
          isWorkerActive = false;
          this.activeWorkers.delete(address);
          return;
        }

        const nonce = this.generateIncrementalNonce(nonceCounter);
        nonceCounter += BigInt(1);

        const preimageBytes = this.buildPreimageBytes(
          nonce,
          address,
          challengeData.challenge_id,
          challengeData.difficulty,
          challengeData.no_pre_mine,
          challengeData.latest_submission,
          challengeData.no_pre_mine_hour,
        );

        // Usar o WASM diretamente com bytes (mais eficiente)
        const isValid = this.ashmaizeService.validateSolution(
          preimageBytes,
          challengeData.no_pre_mine,
          challengeData.difficulty,
        );

        this.attemptsSinceLastLog += 1;
        this.totalAttempts += 1;
        if (isValid) {
          this.logger.log(`🎉 Challenge encontrado pelo endereço ${address}! Nonce: ${nonce}`);
          this.totalValid += 1;
          await this.solutionService.submitSolution(
            address,
            challengeData.challenge_id,
            nonce
          );
          isWorkerActive = false;
          this.activeWorkers.delete(address);

          if (this.pendingAddresses.length > 0) {
            const next = this.pendingAddresses.shift();
            if (next) {
              this.activeWorkers.add(next.address);
              this.startMiningForAddress(next.address, next.index);
            }
          }
        }

      } catch (e) {
        this.logger.error(`Erro no worker ${address}: ${e.message}`);
      }
    };

    const runWorker = async () => {
      if (!this.isMining || !isWorkerActive) return;
      await worker();
      if (this.isMining && isWorkerActive) {
        const timeoutId = setTimeout(runWorker, this.miningInterval);
        this.miningWorkers.set(address, timeoutId);
      }
    };

    runWorker().catch(() => {});
  }

  private buildPreimageBytes(
    nonce: string,
    address: string,
    challengeId: string,
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
  ): Uint8Array {
    const hexToBytes = (hex: string): Uint8Array => {
      if (hex.length % 2 !== 0) throw new Error(`Invalid hex length: ${hex.length}`);
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      return out;
    };
    const utf8 = (str: string): Uint8Array => new TextEncoder().encode(str);
    const parts: Uint8Array[] = [
      hexToBytes(nonce),
      utf8(address),
      utf8(challengeId),
      hexToBytes(difficulty),
      hexToBytes(noPreMine),
      utf8(latestSubmission),
      utf8(noPreMineHour),
    ];
    const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) { result.set(p, offset); offset += p.length; }
    return result;
  }

  private generateIncrementalNonce(baseNonce: bigint): string {
    const hex = baseNonce.toString(16);
    return hex.padStart(16, '0').substring(0, 16);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopMining() {
    this.isMining = false;
    this.miningWorkers.forEach(timeoutId => clearTimeout(timeoutId));
    this.miningWorkers.clear();
    this.activeWorkers.clear();
    this.pendingAddresses = [];
    if (this.statsTimer) { clearInterval(this.statsTimer); this.statsTimer = null; }
    this.logger.log('⛏️  Mineração parada');
  }

  getMiningStatus() {
    return {
      isMining: this.isMining,
      activeWorkers: this.activeWorkers.size,
      pendingAddresses: this.pendingAddresses.length,
      totalWorkers: this.miningWorkers.size,
      maxConcurrent: this.maxConcurrentWorkers,
      interval: this.miningInterval,
    };
  }

  getActiveAddressesSet(): Set<string> {
    return this.activeWorkers;
  }

  getChallengeInfo() {
    try {
      const challenge = this.challengeService.getCurrentChallenge();
      const currentChallengeId = challenge.challenge?.challenge_id || null;
      return {
        currentChallengeId,
        lastChallengeId: this.lastChallengeId,
        hasChanged: this.lastChallengeId !== null && this.lastChallengeId !== currentChallengeId,
        lastNoPreMine: this.lastNoPreMine,
        currentNoPreMine: challenge.challenge?.no_pre_mine || null,
      };
    } catch {
      return {};
    }
  }

  private startStatsLogger() {
    if (this.statsTimer) return;
    this.statsTimer = setInterval(() => {
      const challenge = this.challengeService.getCurrentChallenge();
      const challengeId = challenge.challenge?.challenge_id || 'N/A';
      const secs = this.statsIntervalMs / 1000;
      const hps = this.attemptsSinceLastLog / secs;
      this.logger.log(
        `📈 Mining stats — H/s: ${hps.toFixed(1)}, attempts(total): ${this.totalAttempts}, valid(total): ${this.totalValid}, ` +
        `activeWorkers: ${this.activeWorkers.size}, pending: ${this.pendingAddresses.length}, challenge: ${challengeId}`
      );
      this.attemptsSinceLastLog = 0;
    }, this.statsIntervalMs);
  }
}
