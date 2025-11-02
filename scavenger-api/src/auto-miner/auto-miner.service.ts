import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardanoDerivationService } from '../cardano-derivation/cardano-derivation.service';
import { StorageService } from '../storage/storage.service';
import { RegisterService } from '../register/register.service';
import { ChallengeService } from '../challenge/challenge.service';
import { AshmaizeService } from '../ashmaize/ashmaize.service';
import { SolutionService } from '../solution/solution.service';
import { TermsService } from '../terms/terms.service';

@Injectable()
export class AutoMinerService implements OnModuleInit {
  private readonly logger = new Logger(AutoMinerService.name);
  private isMining = false;
  private miningWorkers: Map<string, NodeJS.Timeout> = new Map();
  
  // Pool de workers ativos (limita concorrência)
  private activeWorkers: Set<string> = new Set();
  private readonly maxConcurrentWorkers: number;
  
  // Controle de intervalo entre tentativas
  private readonly miningInterval: number; // ms entre cada tentativa
  
  // Fila de endereços aguardando para minerar
  private pendingAddresses: Array<{ address: string; index: number }> = [];
  
  // Rastrear último no_pre_mine usado para limpeza de ROMs
  private lastNoPreMine: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly cardanoDerivation: CardanoDerivationService,
    private readonly storageService: StorageService,
    private readonly registerService: RegisterService,
    private readonly challengeService: ChallengeService,
    private readonly ashmaizeService: AshmaizeService,
    private readonly solutionService: SolutionService,
    private readonly termsService: TermsService,
  ) {
    // Configurações otimizadas para evitar sobrecarga
    // Máximo de workers simultâneos (padrão: 5 para não sobrecarregar)
    this.maxConcurrentWorkers = parseInt(
      this.configService.get<string>('MAX_CONCURRENT_WORKERS', '5')
    );
    
    // Intervalo entre tentativas em ms (padrão: 10ms para mineração rápida)
    // Com intervalo baixo, conseguimos muitas tentativas por segundo
    // IMPORTANTE: Com setTimeout recursivo, o próximo só roda DEPOIS que o anterior terminou
    // então não há risco de sobrecarga mesmo com intervalo baixo
    this.miningInterval = parseInt(
      this.configService.get<string>('MINING_INTERVAL_MS', '10')
    );
    
    this.logger.log(
      `⚙️  Configuração de mineração: ${this.maxConcurrentWorkers} workers simultâneos, ` +
      `intervalo de ${this.miningInterval}ms entre tentativas`
    );
  }

  async onModuleInit() {
    const seedPhrase = this.configService.get<string>('SEED_PHRASE');
    const autoMine = this.configService.get<string>('AUTO_MINE', 'true');

    if (!seedPhrase) {
      this.logger.warn('SEED_PHRASE não configurada. Mineração automática desabilitada.');
      this.logger.warn('Configure SEED_PHRASE no arquivo .env para habilitar mineração automática.');
      return;
    }

    if (autoMine === 'false') {
      this.logger.log('AUTO_MINE=false. Mineração automática desabilitada.');
      return;
    }

    this.logger.log('🚀 Iniciando mineração automática...');
    
    try {
      await this.startAutoMining(seedPhrase);
    } catch (error) {
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

    // Derivar endereços
    const addresses = await this.cardanoDerivation.deriveMultipleAddresses(
      seedPhrase,
      count,
      0, // account 0
    );

    this.logger.log(`✅ ${addresses.length} endereços derivados`);

    // Obter mensagem dos termos
    const terms = this.termsService.getTermsAndConditions();
    const message = terms.message;

    // Registrar todos os endereços
    this.logger.log('📝 Registrando endereços...');
    
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      
      try {
        // Assinar mensagem dos termos
        // Usar a account correta (0, 1, 2, ...) e sempre index 0 do endereço
        const signature = await this.cardanoDerivation.signMessage(
          message,
          seedPhrase,
          addr.account || i, // Account do endereço (0, 1, 2, ...)
          0, // Sempre index 0 do endereço (0/0)
        );

        // Registrar endereço
        await this.registerService.register(addr.address, signature, addr.pubkey);
        
        this.logger.log(`✅ Endereço ${i + 1}/${addresses.length} registrado: ${addr.address.substring(0, 20)}...`);
        
        // Pequeno delay para não sobrecarregar
        await this.delay(100);
      } catch (error) {
        // Se já registrado, continua
        if (error.message?.includes('already registered') || 
            error.message?.includes('Conflict')) {
          this.logger.log(`⚠️  Endereço ${i + 1} já estava registrado`);
        } else {
          this.logger.error(`❌ Erro ao registrar endereço ${i + 1}: ${error.message}`);
        }
      }
    }

    this.logger.log('✅ Todos os endereços registrados!');
    this.logger.log('⛏️  Iniciando mineração...');

    // Aguardar um pouco antes de começar a minerar
    await this.delay(2000);

    // Adicionar todos os endereços à fila
    this.pendingAddresses = addresses.map(addr => ({
      address: addr.address,
      index: addr.index,
    }));

    this.logger.log(
      `🚀 Iniciando mineração com pool de ${this.maxConcurrentWorkers} workers simultâneos...`
    );
    this.logger.log(
      `📊 Total de ${addresses.length} endereços aguardando processamento`
    );

    // Iniciar o pool de workers (limita concorrência)
    this.logger.log(`📊 Antes de iniciar pool: ${this.pendingAddresses.length} endereços na fila`);
    this.startWorkerPool();
    
    // Log após um delay para verificar se iniciou
    setTimeout(() => {
      this.logger.log(
        `📊 Status após iniciar: ${this.activeWorkers.size} workers ativos, ` +
        `${this.pendingAddresses.length} na fila, ${this.miningWorkers.size} intervals criados`
      );
    }, 3000);
  }

  /**
   * Inicia o pool de workers com limite de concorrência
   */
  private startWorkerPool() {
    this.logger.log(
      `🚀 Iniciando pool: ${this.pendingAddresses.length} endereços, ` +
      `máximo ${this.maxConcurrentWorkers} workers simultâneos`
    );

    const processNext = async () => {
      if (!this.isMining) {
        this.logger.debug('⏸️  Mineração pausada, parando processamento');
        return;
      }

      // Se há espaço no pool e endereços na fila
      if (
        this.activeWorkers.size < this.maxConcurrentWorkers &&
        this.pendingAddresses.length > 0
      ) {
        const next = this.pendingAddresses.shift();
        if (next) {
          this.logger.log(
            `🎯 Adicionando worker ${this.activeWorkers.size + 1}/${this.maxConcurrentWorkers}: ` +
            `endereço ${next.index + 1} (${next.address.substring(0, 20)}...)`
          );
          this.activeWorkers.add(next.address);
          this.startMiningForAddress(next.address, next.index);
        }
      }

      // Agendar próxima verificação se ainda houver endereços na fila
      if (this.isMining && (this.pendingAddresses.length > 0 || this.activeWorkers.size < this.maxConcurrentWorkers)) {
        setTimeout(processNext, 500); // Verifica a cada 500ms se há espaço no pool
      } else if (!this.isMining) {
        this.logger.log('✅ Pool de workers finalizado');
      }
    };

    // Processar inicialmente alguns workers
    const initialCount = Math.min(this.maxConcurrentWorkers, this.pendingAddresses.length);
    this.logger.log(`📦 Iniciando ${initialCount} workers iniciais...`);
    
    for (let i = 0; i < initialCount; i++) {
      setTimeout(() => {
        this.logger.debug(`⏰ Agendando worker inicial ${i + 1}/${initialCount}`);
        processNext();
      }, i * 200); // Espaçar início dos workers
    }

    // Também iniciar o loop contínuo para processar resto da fila
    setTimeout(() => processNext(), initialCount * 200 + 500);
  }

  private startMiningForAddress(address: string, index: number) {
    this.logger.log(`⛏️  Iniciando worker para endereço ${index + 1}: ${address.substring(0, 20)}...`);
    let nonceCounter = BigInt(index * 1000000); // Cada worker começa em um range diferente
    const increment = BigInt(1);
    let isWorkerActive = true;
    let attemptCount = 0;
    let lastLogTime = Date.now();
    
    const worker = async () => {
      if (!this.isMining || !isWorkerActive) {
        return;
      }

      try {
        // Obter desafio atual
        const challenge = this.challengeService.getCurrentChallenge();
        
        if (challenge.code !== 'active') {
          if (challenge.code === 'after') {
            this.logger.log(`⏰ Mineração encerrada (período após término)`);
            this.stopMining();
          }
          return;
        }

        if (!challenge.challenge) {
          this.logger.debug(`⚠️  Worker ${index + 1}: Desafio não disponível`);
          return;
        }

        const challengeData = challenge.challenge;
        
        // Limpar ROMs de desafios expirados apenas quando o desafio muda
        // Isso libera memória e garante que apenas 1 ROM fica em cache
        if (this.lastNoPreMine !== challengeData.no_pre_mine) {
          try {
            const wasmService = this.ashmaizeService.wasmServiceForCleanup;
            if (wasmService && typeof wasmService.clearExpiredRoms === 'function') {
              if (this.lastNoPreMine) {
                // Desafio mudou, limpar ROM antiga
                this.logger.log(`🔄 Desafio mudou, limpando ROM do desafio anterior`);
                wasmService.clearExpiredRoms(challengeData.no_pre_mine);
              }
              this.lastNoPreMine = challengeData.no_pre_mine;
            }
          } catch (e) {
            // Ignorar erros de limpeza
          }
        }

        // Verificar prazo
        const currentTime = new Date();
        const latestSubmission = new Date(challengeData.latest_submission);
        if (currentTime > latestSubmission) {
          this.logger.log(`⏰ Prazo expirado para desafio ${challengeData.challenge_id}`);
          isWorkerActive = false;
          this.activeWorkers.delete(address);
          return;
        }

        // Verificar se já submeteu solução para este desafio
        const existingSolution = this.storageService.getSolution(
          address,
          challengeData.challenge_id,
        );
        if (existingSolution) {
          // Já encontrou solução, pode parar este worker
          this.logger.log(`✅ Endereço ${index + 1} já submeteu solução, parando worker`);
          isWorkerActive = false;
          this.activeWorkers.delete(address);
          const timeoutId = this.miningWorkers.get(address);
          if (timeoutId) {
            clearTimeout(timeoutId);
            this.miningWorkers.delete(address);
          }
          return;
        }

        // Gerar nonce incremental
        const nonce = this.generateIncrementalNonce(nonceCounter);
        const nonceValue = nonceCounter.toString(); // Para debug
        nonceCounter += increment;
        attemptCount++;

        // Log a cada 1000 tentativas ou a cada 10 segundos
        const currentTimestamp = Date.now();
        if (attemptCount % 1000 === 0 || (currentTimestamp - lastLogTime) > 10000) {
          this.logger.debug(
            `🔍 Worker ${index + 1}: ${attemptCount.toLocaleString()} tentativas, ` +
            `nonce hex: ${nonce}, nonce decimal: ${nonceValue}, próximo será: ${nonceCounter.toString()}`
          );
          lastLogTime = currentTimestamp;
        }

        // Construir preimage
        const preimage = this.buildPreimage(
          nonce,
          address,
          challengeData.challenge_id,
          challengeData.difficulty,
          challengeData.no_pre_mine,
          challengeData.latest_submission,
          challengeData.no_pre_mine_hour,
        );

        // Validar solução usando AshMaize real
        let isValid = false;
        let validationStart = Date.now();
        let hashSample = '';
        try {
          isValid = await this.ashmaizeService.validateSolution(
            preimage,
            challengeData.no_pre_mine,
            challengeData.difficulty,
          );
          const validationTime = Date.now() - validationStart;
          
          // Obter hash para debug (apenas a cada 1000 tentativas para não impactar performance)
          if (attemptCount % 1000 === 0) {
            try {
              // Obter hash através do serviço AshMaize
              hashSample = await this.ashmaizeService.computeHash(preimage, challengeData.no_pre_mine);
              hashSample = hashSample.substring(0, 16); // Primeiros 8 bytes (16 hex chars)
            } catch (e) {
              // Ignorar erro ao obter hash para debug
            }
            
            this.logger.debug(
              `🔍 Worker ${index + 1}: ${attemptCount.toLocaleString()} tentativas, ` +
              `validação levou ${validationTime}ms, ` +
              `difficulty: ${challengeData.difficulty}, ` +
              `nonce: ${nonce} (decimal: ${nonceValue}), ` +
              `${hashSample ? `hash prefix: ${hashSample}, ` : ''}` +
              `resultado: ${isValid ? '✅ VÁLIDO!' : '❌ inválido'}`
            );
          }
          
          // Se encontrar solução válida, logar imediatamente
          if (isValid) {
            this.logger.log(
              `🎉🎉🎉 SOLUÇÃO ENCONTRADA! Worker ${index + 1}, ` +
              `nonce: ${nonce}, ` +
              `preimage length: ${preimage.length}, ` +
              `validação levou ${validationTime}ms`
            );
          }
        } catch (validationError: any) {
          const validationTime = Date.now() - validationStart;
          // Log erros de validação (mas não para cada tentativa que falha)
          if (attemptCount % 1000 === 0) {
            this.logger.warn(
              `⚠️  Worker ${index + 1}: Erro na validação após ${validationTime}ms: ${validationError.message}`
            );
          }
          // Continuar tentando mesmo se houver erro
        }

        if (isValid) {
          // Submeter solução
          try {
            await this.solutionService.submitSolution(
              address,
              challengeData.challenge_id,
              nonce,
            );
            
            this.logger.log(
              `✅ Solução encontrada e submetida! Endereço ${index + 1}/${this.activeWorkers.size}, Nonce: ${nonce}`
            );
            
            // Solução encontrada, parar este worker
            isWorkerActive = false;
            this.activeWorkers.delete(address);
            const timeoutId = this.miningWorkers.get(address);
            if (timeoutId) {
              clearTimeout(timeoutId);
              this.miningWorkers.delete(address);
            }
            
            // Adicionar próximo endereço da fila ao pool
            if (this.pendingAddresses.length > 0) {
              const next = this.pendingAddresses.shift();
              if (next) {
                this.activeWorkers.add(next.address);
                this.startMiningForAddress(next.address, next.index);
              }
            }
          } catch (error) {
            // Se já foi submetida, parar worker
            if (error.message?.includes('already')) {
              this.logger.log(`ℹ️  Endereço ${index + 1} já tinha solução submetida`);
              isWorkerActive = false;
              this.activeWorkers.delete(address);
              const timeoutId = this.miningWorkers.get(address);
              if (timeoutId) {
                clearTimeout(timeoutId);
                this.miningWorkers.delete(address);
              }
              
              // Adicionar próximo endereço da fila
              if (this.pendingAddresses.length > 0) {
                const next = this.pendingAddresses.shift();
                if (next) {
                  this.activeWorkers.add(next.address);
                  this.startMiningForAddress(next.address, next.index);
                }
              }
            } else if (!error.message?.includes('not meet difficulty')) {
              this.logger.debug(`Erro ao submeter solução: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        // Log erros importantes (mas não spam de "does not meet difficulty")
        const errorMsg = error?.message || String(error);
        if (!errorMsg?.includes('not registered') && 
            !errorMsg?.includes('does not meet') &&
            !errorMsg?.includes('Challenge not found')) {
          // Log apenas a cada 1000 tentativas para não spammar
          if (attemptCount % 1000 === 0) {
            this.logger.warn(`⚠️  Erro no worker ${index + 1}: ${errorMsg}`);
          }
        }
      }
    };

    // IMPORTANTE: Usar setTimeout recursivo ao invés de setInterval
    // Isso garante que o próximo worker só roda DEPOIS que o anterior terminou
    const runWorker = async () => {
      if (!this.isMining || !isWorkerActive) {
        const existingTimeout = this.miningWorkers.get(address);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          this.miningWorkers.delete(address);
        }
        return;
      }
      
      await worker();
      
      // Agendar próxima execução APENAS se ainda estiver ativo
      if (this.isMining && isWorkerActive) {
        const timeoutId = setTimeout(runWorker, this.miningInterval);
        this.miningWorkers.set(address, timeoutId);
      }
    };

    // Iniciar primeiro worker
    runWorker().catch(error => {
      this.logger.error(`Unhandled error in worker for address ${address}: ${error.message}`);
    });
  }

  private buildPreimage(
    nonce: string,
    address: string,
    challengeId: string,
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
  ): string {
    // Conforme especificação: nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
    return `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  }

  private generateNonce(): string {
    // Gerar nonce aleatório de 64 bits (16 hex chars)
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(8);
    return randomBytes.toString('hex');
  }

  /**
   * Gera nonce incremental para mineração mais eficiente
   */
  private generateIncrementalNonce(baseNonce: bigint): string {
    return baseNonce.toString(16).padStart(16, '0');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopMining() {
    this.isMining = false;
    this.miningWorkers.forEach((timeoutId) => clearTimeout(timeoutId));
    this.miningWorkers.clear();
    this.activeWorkers.clear();
    this.pendingAddresses = [];
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
}
