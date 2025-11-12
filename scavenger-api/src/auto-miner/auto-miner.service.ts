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

import { Challenge } from '../challenge/types';

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
  private nonceCounter: bigint;
  private workerNonces: Map<string, bigint> = new Map();
  private readonly maxConcurrentWorkers: number;
  private readonly miningInterval: number;
  private readonly statsIntervalMs: number;
  private statsTimer: NodeJS.Timeout | null = null;
  private attemptsSinceLastLog = 0;
  private totalAttempts = 0;
  private totalValid = 0;
  private workerAttempts: Map<string, number> = new Map();
  private initialHex: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cardanoDerivation: CardanoDerivationService,
    private readonly storageService: StorageService,
    private readonly registerService: RegisterService,
    private readonly challengeService: ChallengeService,
    private readonly ashmaizeService: AshmaizeWasmService,
    private readonly solutionService: SolutionService,
    private readonly termsService: TermsService,
  ) {
    this.maxConcurrentWorkers = parseInt(
      this.configService.get<string>('MAX_CONCURRENT_WORKERS', '14') // Configurado para 14 workers em um CPU de 16 núcleos
    );
    this.miningInterval = parseInt(
      this.configService.get<string>('MINING_INTERVAL_MS', '10')
    );
    this.statsIntervalMs = parseInt(
      this.configService.get<string>('LOG_MINING_STATS_INTERVAL_MS', '60000')
    );

    // Verifica se deve usar nonce fixo ou aleatório
    const useFixedNonce = this.configService.get<string>('USE_FIXED_NONCE', 'false') === 'true';
    const initialNonceHex = this.configService.get<string>('INITIAL_NONCE_HEX', '');

    if (useFixedNonce && initialNonceHex) {
      try {
        // Remove qualquer prefixo '0x' se existir
        const cleanHex = initialNonceHex.replace('0x', '');
        // Garante que o nonce tem exatamente 16 caracteres (64 bits)
        const paddedHex = cleanHex.padStart(16, '0');
        // Começa exatamente no nonce fornecido, sem incrementar
        this.nonceCounter = BigInt(`0x${paddedHex}`) - BigInt(1); // Subtrai 1 porque o código incrementa antes de usar
        this.initialHex = paddedHex;
        this.logger.log(
          `🎲 Usando nonce inicial fixo:\n` +
          `   Valor: 0x${paddedHex}\n` +
          `   Próximo nonce: 0x${(this.nonceCounter + BigInt(1)).toString(16).padStart(16, '0')}`
        );
      } catch (error) {
        this.logger.warn(`⚠️ Nonce hexadecimal inválido: ${initialNonceHex}. Usando nonce aleatório.`);
        this.nonceCounter = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        this.initialHex = this.nonceCounter.toString(16).padStart(16, '0');
      }
    } else {
      // Inicia com um nonce aleatório de 64 bits em hexadecimal
      this.nonceCounter = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      this.initialHex = this.nonceCounter.toString(16).padStart(16, '0');
      this.logger.log(`🎲 Usando nonce inicial aleatório: 0x${this.initialHex}`);
    }

    this.logger.log(
      `⚙️  Configuração de mineração: ${this.maxConcurrentWorkers} workers simultâneos, ` +
        `intervalo de ${this.miningInterval}ms entre tentativas, ` +
        `logs a cada ${this.statsIntervalMs}ms`,
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

    this.allAddresses = addresses.map((addr) => ({
      address: addr.address,
      index: addr.index,
    }));
    this.pendingAddresses = [...this.allAddresses];

    this.logger.log(`🚀 Iniciando mineração com pool de ${this.maxConcurrentWorkers} workers simultâneos...`);
    this.startWorkerPool();
    this.challengeChangeCallbacks.push(() => this.resetForNewChallenge());
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
    this.logger.log('🔄 Novo desafio detectado...');
    // Reseta apenas a fila de endereços pendentes para o novo desafio
    this.pendingAddresses = [...this.allAddresses];
    this.isResetting = false;
    this.logger.log('✅ Fila de endereços reiniciada para o novo desafio. Workers existentes continuarão no desafio anterior.');
  }

  private async startMiningForAddress(address: string, index: number) {
    const runWorker = async () => {
      const currentChallenge = await this.challengeService.getCurrentChallenge();
      const challengeData = currentChallenge.challenge;

      if (!challengeData || currentChallenge.code !== 'active') {
        this.logger.log('⚠️ Desafio não está ativo. Pausando mineração...');
        this.stopMining();
        return;
      }

      // Verifica se já passou 24h desde o latest_submission do challenge
      const latestSubmission = new Date(challengeData.latest_submission);
      const now = new Date();
      const hoursElapsed = (now.getTime() - latestSubmission.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 24) {
        this.logger.log(`⏰ Challenge ${challengeData.challenge_id} expirou (${hoursElapsed.toFixed(1)}h). Trocando worker...`);
        this.stopWorkerAndReplace(address);
        return;
      }

      if (this.storageService.getSolution(address, challengeData.challenge_id)) {
        this.logger.log(`✅ Solução já conhecida para ${address.substring(0, 20)}... pulando...`);
        this.stopWorkerAndReplace(address);
        return;
      }

      const result = await this.mineForAddress(address, challengeData);
      
      if (result.found) {
        this.logger.log(
          `\n� ==========================================\n` +
          `�🎉 CHALLENGE ENCONTRADO! 🎉\n` +
          `🏆 Challenge ID: ${challengeData.challenge_id}\n` +
          `📍 Endereço: ${address}\n` +
          `🎲 Nonce: ${result.nonce}\n` +
          `🎯 ==========================================\n`
        );
        this.totalValid += 1;
        await this.solutionService.submitSolution(address, challengeData.challenge_id, result.nonce!);
        this.stopWorkerAndReplace(address);
      } else {
        if (this.isMining) {
          this.miningWorkers.set(address, setTimeout(() => runWorker(), this.miningInterval));
        }
      }
    };

    runWorker().catch((error) => {
      this.logger.error(`Erro no worker para ${address}: ${error.message}`);
    });
  }

  private stopWorkerAndReplace(address: string) {
    const timeoutId = this.miningWorkers.get(address);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.miningWorkers.delete(address);
      this.activeWorkers.delete(address);
    }

    if (this.pendingAddresses.length > 0 && this.isMining) {
      const next = this.pendingAddresses.shift();
      if (next) {
        this.activeWorkers.add(next.address);
        this.startMiningForAddress(next.address, next.index);
        this.logger.debug(`🔄 Worker substituído: ${address.substring(0, 20)}... → ${next.address.substring(0, 20)}...`);
      }
    } else if (this.activeWorkers.size === 0 && this.pendingAddresses.length === 0) {
      this.logger.log(`✅ Todos os ${this.allAddresses.length} endereços processaram o challenge atual. Aguardando próximo challenge...`);
    }
  }

  private validateHashAgainstTarget(hashHex: string, targetDifficulty: string): boolean {
    // Pega os primeiros 8 caracteres do hash (4 bytes)
    const hashPrefix = hashHex.slice(0, 8);
    // Converte para número e força como uint32 com >>> 0
    const hashValue = parseInt(hashPrefix, 16) >>> 0;
    // Converte o target da API para número (removendo zeros à esquerda)
    const target = parseInt(targetDifficulty, 16) >>> 0;
    // Faz o OR bit a bit e compara com o target
    const orResult = (hashValue | target) >>> 0;
    return orResult === target;
  }

  private async mineForAddress(
    address: string,
    challengeData: Challenge,
  ): Promise<{ found: boolean; nonce?: string; hash?: string }> {
    // Incrementa o contador e gera um novo nonce hexadecimal de 64 bits
    this.nonceCounter = (this.nonceCounter + BigInt(1));
    const nonce = this.nonceCounter.toString(16).padStart(16, '0');
  

    
    // Log do nonce a cada 10000 tentativas para debug
    if (this.totalAttempts % 10000 === 0) {
      this.logger.debug(`Current nonce: 0x${nonce}`);
    }
    
    // Montar o preimage exatamente igual ao browser - ordem e case importam!
    const preimageString = 
      nonce + // nonce em lowercase de 64 bits (16 caracteres hex)
      address + // endereço cardano
      challengeData.challenge_id + // challenge id com ** (ex: **D07C12)
      challengeData.difficulty + // difficulty da API (ex: 00001FFF)
      challengeData.no_pre_mine + // no_pre_mine da API
      challengeData.latest_submission + // latest_submission da API
      challengeData.no_pre_mine_hour; // no_pre_mine_hour da API
      
    // this.logger.debug(`Preimage: ${preimageString}`);
    const hashHex = this.ashmaizeService.computeHash(
      preimageString,
      challengeData.no_pre_mine,
    );
    // this.logger.debug(`Hash: ${hashHex}`);
    this.attemptsSinceLastLog++;
    this.totalAttempts++;

    // Incrementa as tentativas do worker específico
    const workerAttempts = (this.workerAttempts.get(address) || 0) + 1;
    this.workerAttempts.set(address, workerAttempts);

    // Log debug a cada 2000 tentativas por worker
    if (workerAttempts %1=== 0) {
      const hashPrefix = hashHex.slice(0, 8);
      const hashValue = parseInt(hashPrefix, 16) >>> 0;
      const target = parseInt(challengeData.difficulty, 16) >>> 0;
      const orResult = (hashValue | target) >>> 0;
      
      this.logger.debug(
        `[DEBUG] Worker ${address.substring(0, 20)}... (attempts: ${workerAttempts}):\n\n` +
        `  address=${address}\n` +
        `  challenge_id=${challengeData.challenge_id}\n\n` +
        `  preimage=${preimageString}\n` +
          `  hashHex=${hashHex}\n` +
          `  hashPrefix=${hashPrefix} (0x${hashValue.toString(16).padStart(8, '0')})\n` +
          `  target=0x${target.toString(16).padStart(8, '0')}\n` +
          `  orResult=0x${orResult.toString(16).padStart(8, '0')} (expected 0x${target.toString(16).padStart(8, '0')})\n` +
          `  hashValue|target == target: ${orResult === target}\n\n\n`,
      );
    }

    if (this.validateHashAgainstTarget(hashHex, challengeData.difficulty)) {
      return { found: true, nonce: nonce, hash: hashHex };
    }

    return { found: false };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  async getChallengeInfo() {
    try {
      const challenge = await this.challengeService.getCurrentChallenge();
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
      // Execute de forma assíncrona mas não aguarde
      this.challengeService
        .getCurrentChallenge()
        .then((challenge) => {
          const challengeId = challenge.challenge?.challenge_id || 'N/A';
          const secs = this.statsIntervalMs / 1000;
          const hps = this.attemptsSinceLastLog / secs;
          this.logger.log(
            `📈 Mining stats — H/s: ${hps.toFixed(1)}, attempts(total): ${this.totalAttempts}, valid(total): ${this.totalValid}, ` +
              `activeWorkers: ${this.activeWorkers.size}, pending: ${this.pendingAddresses.length}, challenge: ${challengeId}`,
          );
          this.attemptsSinceLastLog = 0;
        })
        .catch((error) => {
          this.logger.error(
            'Erro ao obter challenge para estatísticas:',
            error,
          );
        });
    }, this.statsIntervalMs);
  }
}
