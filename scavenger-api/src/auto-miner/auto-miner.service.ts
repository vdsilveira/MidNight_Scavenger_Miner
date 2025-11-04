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
      // repovoar fila com TODOS os endereços novamente (começar do início)
      this.pendingAddresses = [...this.allAddresses];
      this.logger.log(`📋 Fila resetada com ${this.allAddresses.length} endereços. Reiniciando workers...`);
      // reiniciar o pool
      this.startWorkerPool();
    } finally {
      this.isResetting = false;
    }
  }

  private startMiningForAddress(address: string, index: number) {
    let isWorkerActive = true;

    // ✅ Loop de mineração como no browser (mine-session.work.js linha 136-194)
    // Executa múltiplas tentativas em lotes de ~200ms e depois agenda próxima execução
    const runWorker = async () => {
      if (!this.isMining || !isWorkerActive) return;
      
      // Verificar mudança de challenge
      const challenge = this.challengeService.getCurrentChallenge();
      if (challenge.code === 'active' && challenge.challenge) {
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
      }
      
      const start = Date.now();
      let localAttempts = 0;
      let found = false;
      
      // Executar tentativas por ~200ms como no browser (mineLoop)
      while (Date.now() - start < 200 && this.isMining && isWorkerActive && !found) {
        try {
          const currentChallenge = this.challengeService.getCurrentChallenge();
          if (currentChallenge.code !== 'active' || !currentChallenge.challenge) {
            found = true;
            break;
          }

          const challengeData = currentChallenge.challenge;
          const currentTime = new Date();
          if (currentTime > new Date(challengeData.latest_submission)) {
            found = true;
            break;
          }

          if (this.storageService.getSolution(address, challengeData.challenge_id)) {
            found = true;
            break;
          }

          // ✅ Gerar nonce aleatório como no browser (mine-session.work.js linha 145-147)
          const nonce = this.generateRandomNonce();

          // ✅ Construir preimage EXATAMENTE como o browser worker faz (mine-session.work.js linhas 148-156)
          // No browser, o preimage é uma STRING que é concatenada e depois codificada dentro do getHexHash
          const preimageString = [
            nonce,
            address,
            challengeData.challenge_id,
            challengeData.difficulty,
            challengeData.no_pre_mine,
            challengeData.latest_submission,
            challengeData.no_pre_mine_hour,
          ].join('');

          // ✅ Passar como STRING para que seja codificado dentro do validateSolution (como no browser)
          const isValid = this.ashmaizeService.validateSolution(
            preimageString,
            challengeData.no_pre_mine,
            challengeData.difficulty,
          );

          this.attemptsSinceLastLog += 1;
          this.totalAttempts += 1;
          localAttempts++;
          
          // Debug: logar hash a cada 100000 tentativas para verificar se está calculando
          if (this.totalAttempts % 100000 === 0) {
            const hashHex = this.ashmaizeService.wasmServiceForCleanup.computeHash(preimageString, challengeData.no_pre_mine);
            const hashPrefix = hashHex.substring(0, 8);
            const hashValue = parseInt(hashPrefix, 16);
            const targetValue = parseInt(challengeData.difficulty, 16);
            const meets = (hashValue | targetValue) === targetValue;
            this.logger.log(
              `[DEBUG HASH] address=${address.substring(0, 20)}... nonce=${nonce} ` +
              `hash=${hashPrefix} (0x${hashValue.toString(16).padStart(8, '0')}) target=0x${targetValue.toString(16).padStart(8, '0')} ` +
              `(hash|target)=0x${(hashValue | targetValue).toString(16).padStart(8, '0')} meets=${meets}`
            );
          }

          if (isValid) {
            found = true;
            this.logger.log(`🎉 Challenge encontrado pelo endereço ${address}! Nonce: ${nonce}`);
            this.totalValid += 1;
            try {
              await this.solutionService.submitSolution(
                address,
                challengeData.challenge_id,
                nonce
              );
              this.logger.log(`✅ Solução submetida com sucesso para ${address.substring(0, 20)}...`);
            } catch (e: any) {
              this.logger.error(`❌ Erro ao submeter solução: ${e.message}`);
            }
            break;
          }
        } catch (e: any) {
          this.logger.error(`Erro no worker ${address}: ${e.message}`);
          found = true;
          break;
        }
      }
      
      // Se encontrou solução ou precisa parar, substituir worker
      if (found) {
        this.stopWorkerAndReplace(address);
        return;
      }
      
      // Se worker ainda está ativo, agendar próxima execução (setTimeout(0) como no browser)
      if (this.isMining && isWorkerActive) {
        const timeoutId = setTimeout(runWorker, 0);
        this.miningWorkers.set(address, timeoutId);
      }
    };

    runWorker().catch(() => {});
  }

  /**
   * Para um worker e substitui imediatamente pelo próximo endereço da fila
   * Se não houver mais endereços, apenas remove o worker
   */
  private stopWorkerAndReplace(address: string) {
    // Parar worker atual
    const timeoutId = this.miningWorkers.get(address);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.miningWorkers.delete(address);
    }
    this.activeWorkers.delete(address);

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

  /**
   * Constrói o preimage como STRING concatenada
   * EXATAMENTE como o browser faz em mine-session.work.js (linhas 148-156):
   * const preimage = [tryNonce, _address, _challengeId, _difficultyHex, 
   *                   _noPreMine, _latestSubmission, _noPreMineHour].join('');
   * 
   * A codificação para UTF-8 é feita DENTRO do getHexHash/validateSolution (como no browser)
   */
  private buildPreimageString(
    nonce: string,
    address: string,
    challengeId: string,
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
  ): string {
    // ✅ IMPORTANTE: Concatena todas as strings (como no browser)
    // A codificação para UTF-8 será feita dentro do validateSolution (como no getHexHash do browser)
    return [
      nonce,
      address,
      challengeId, // COM asteriscos se presente (como a API retorna)
      difficulty,
      noPreMine,
      latestSubmission,
      noPreMineHour,
    ].join('');
  }

  /**
   * Gera nonce aleatório como no browser (mine-session.work.js linha 145-147):
   * Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0')
   */
  private generateRandomNonce(): string {
    const randomValue = Math.floor(Math.random() * 1e16);
    return randomValue.toString(16).padStart(16, '0');
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
