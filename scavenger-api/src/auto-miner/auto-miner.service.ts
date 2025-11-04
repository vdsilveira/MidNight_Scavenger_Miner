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

interface ChallengeData {
  challenge_id: string;
  difficulty: string;
  no_pre_mine: string;
  latest_submission: string;
  no_pre_mine_hour: string;
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
    this.logger.log('🔄 Reiniciando fila e workers para o novo desafio...');
    this.miningWorkers.forEach(timeoutId => clearTimeout(timeoutId));
    this.activeWorkers.clear();
    // repovoar fila com TODOS os endereços novamente (começar do início)
    this.pendingAddresses = [...this.allAddresses];
    this.isResetting = false;
    this.logger.log('✅ Fila e workers reiniciados. Aguardando novo desafio...');
  }

  private async startMiningForAddress(address: string, index: number) {
    const runWorker = async () => {
      const currentChallenge = this.challengeService.getCurrentChallenge();
      const challengeData = currentChallenge.challenge;

      if (!challengeData || currentChallenge.code !== 'active') {
        this.logger.log('⚠️ Desafio não está ativo. Pausando mineração...');
        this.stopMining();
        return;
      }

      // Verifica se já tem solução
      if (this.storageService.getSolution(address, challengeData.challenge_id)) {
        this.logger.log(`✅ Solução já conhecida para ${address.substring(0, 20)}... pulando...`);
        this.stopWorkerAndReplace(address);
        return;
      }

      // Tenta minerar
      const result = await this.mineForAddress(address, challengeData);
      
      if (result.found) {
        this.logger.log(`🎉 Challenge encontrado pelo endereço ${address}! Nonce: ${result.nonce}`);
        this.totalValid += 1;
        
        // Salvar a solução
        await this.solutionService.submitSolution(
          address,
          challengeData.challenge_id,
          result.nonce!
        );
        
        this.stopWorkerAndReplace(address);
      } else {
        // Agendar próxima tentativa se ainda estiver minerando
        if (this.isMining) {
          this.miningWorkers.set(
            address,
            setTimeout(() => runWorker(), this.miningInterval)
          );
        }
      }
    };

    runWorker().catch(error => {
      this.logger.error(`Erro no worker para ${address}: ${error.message}`);
    });
  }

  /**
   * Para um worker e substitui imediatamente pelo próximo endereço da fila,
   * Se não houver mais endereços, apenas remove o worker
   */
  private stopWorkerAndReplace(address: string) {
    // Parar worker atual
    const timeoutId = this.miningWorkers.get(address);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.miningWorkers.delete(address);
      this.activeWorkers.delete(address);
    }
    // Substituir pelo próximo endereço da fila (se houver)
    if (this.pendingAddresses.length > 0 && this.isMining) {
      const next = this.pendingAddresses.shift();
      if (next) {
        this.activeWorkers.add(next.address);
        this.startMiningForAddress(next.address, next.index);
        this.logger.debug(`🔄 Worker substituído: ${address.substring(0, 20)}... → ${next.address.substring(0, 20)}...`);
      }
    } else if (this.activeWorkers.size === 0 && this.pendingAddresses.length === 0) {
      // Todos os endereços processados - aguardar próximo challenge ou reiniciar
      this.logger.log(`✅ Todos os ${this.allAddresses.length} endereços processaram o challenge atual. Aguardando próximo challenge...`);
    }
  }

  // Gera nonce aleatório como no browser (mine-session.work.js linha 145-147):
  // Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0')
  private generateRandomNonce(): string {
    const randomValue = Math.floor(Math.random() * 1e16);
    return randomValue.toString(16).padStart(16, '0');
  }

  private validateHashAgainstTarget(hashHex: string, targetDifficulty: string): boolean {
    // Pega apenas os primeiros 8 caracteres (32 bits) do hash
    const hashPrefix = hashHex.slice(0, 8);
    
    // Converte para números unsigned de 32 bits
    const hashValue = parseInt(hashPrefix, 16) >>> 0;
    const target = parseInt(targetDifficulty, 16) >>> 0;
    
    // Faz OR bit a bit e garante que o resultado é unsigned
    const orResult = (hashValue | target) >>> 0;
    
    // A solução é válida se o OR com o target resultar exatamente no target
    // Isso significa que todos os bits 0 no target também são 0 no hash
    return orResult === target;
  }

  private async mineForAddress(
    address: string,
    challengeData: ChallengeData,
  ): Promise<{ found: boolean; nonce?: string; hash?: string }> {
    const start = Date.now();
    let localAttempts = 0;
    
    while (Date.now() - start < 200) { // mesmo timeout do worker
      const nonce = this.generateRandomNonce();
      const preimageString = [
        nonce,
        address,
        challengeData.challenge_id,
        challengeData.difficulty,
        challengeData.no_pre_mine,
        challengeData.latest_submission,
        challengeData.no_pre_mine_hour,
      ].join('');

      const hashHex = this.ashmaizeService.computeHash(preimageString, challengeData.no_pre_mine);
      localAttempts++;
      this.attemptsSinceLastLog += 1;
      this.totalAttempts += 1;

      if (this.totalAttempts % 100000 === 0) {
        const hashPrefix = hashHex.slice(0, 8);
        const hashValue = parseInt(hashPrefix, 16) >>> 0;
        const targetValue = parseInt(challengeData.difficulty, 16) >>> 0;
        const orResult = (hashValue | targetValue) >>> 0;
        const meetsTarget = orResult === targetValue;
        
        this.logger.log(
          `[DEBUG HASH] address=${address.substring(0, 20)}... nonce=${nonce}\n` +
          `hash=${hashPrefix} (0x${hashValue.toString(16).padStart(8, '0')})\n` +
          `target=0x${targetValue.toString(16).padStart(8, '0')}\n` +
          `(hash|target)=0x${orResult.toString(16).padStart(8, '0')}\n` +
          `meets_target=${meetsTarget}`
        );
      }
      
      if (this.validateHashAgainstTarget(hashHex, challengeData.difficulty)) {
        return {
          found: true,
          nonce,
          hash: hashHex
        };
      }
    }
    
    return { found: false };
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
