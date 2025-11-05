import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import { AshmaizeWasmService } from './ashmaize-wasm.service';

interface MiningWorkerData {
  noPreMine: string;
  noPreMineHour: string;
  difficultyHex: string;
  challengeId: string;
  address: string;
  latestSubmission: string;
}

interface WorkerState {
  worker: Worker;
  address: string | null;
}

@Injectable()
export class AshmaizeWorkerService {
  private readonly logger = new Logger(AshmaizeWorkerService.name);
  private readonly WORKER_COUNT = 5;
  private readonly WORKERS_PER_ADDRESS = 2; // Número de workers por endereço
  private workers: WorkerState[] = [];
  private running = false;
  private pendingAddresses: string[] = [];
  private activeAddresses: Set<string> = new Set();
  private workerGroups: Map<string, Worker[]> = new Map();

  // Constantes do ROM para cada worker
  private readonly NB_LOOPS = 8;
  private readonly NB_INSTRS = 256;
  private readonly PRE_SIZE = 16 * 1024 * 1024; // 16 MB
  private readonly MIXING_NUMBERS = 4;
  private readonly ROM_SIZE = 512 * 1024 * 1024; // 512 MB

  constructor(
    private readonly ashmaizeService: AshmaizeWasmService
  ) {}

  private createWorkersForAddress(address: string, data: MiningWorkerData) {
    const workerPath = path.join(__dirname, 'worker', 'mining.worker.js');
    const workers: Worker[] = [];
    
    for (let i = 0; i < this.WORKERS_PER_ADDRESS; i++) {
      const worker = new Worker(workerPath, {
        workerData: {
          workerId: i,
          address,
          romConfig: {
            nbLoops: this.NB_LOOPS,
            nbInstrs: this.NB_INSTRS,
            preSize: this.PRE_SIZE,
            mixingNumbers: this.MIXING_NUMBERS,
            romSize: this.ROM_SIZE
          },
        },
      });
      
      worker.on('message', (message: { type: string; solution?: any; hashRate?: number }) => {
        if (message.type === 'SOLUTION_FOUND' && message.solution) {
          this.handleSolutionFound(message.solution);
        } else if (message.type === 'HASH_RATE' && message.hashRate) {
          this.logger.debug(`Worker ${address}:${i} hash rate: ${message.hashRate} H/s`);
        }
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker ${address}:${i} error: ${error.message}`);
      });

      worker.on('message', (message: { type: string; solution?: any; hashRate?: number; error?: string }) => {
        if (message.type === 'SOLUTION_FOUND' && message.solution) {
          this.handleSolutionFound(message.solution);
        } else if (message.type === 'HASH_RATE' && message.hashRate) {
          this.logger.debug(`Worker ${address}:${i} hash rate: ${message.hashRate} H/s`);
        } else if (message.type === 'ROM_ERROR') {
          this.logger.error(`Worker ${address}:${i} ROM error: ${message.error}`);
        }
      });

      workers.push(worker);
    }

    this.workerGroups.set(address, workers);
    return workers;
  }

  async startMining(data: MiningWorkerData) {
    this.running = true;
    
    // Criar ou obter workers para este endereço
    const address = data.address;
    
    // Se já existem workers para este endereço, para eles primeiro
    await this.stopMiningForAddress(address);
    
    // Aguardar um pouco para garantir que a memória foi liberada
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Criar novos workers
      const workers = this.createWorkersForAddress(address, data);
      
      // Iniciar mineração em todos os workers deste endereço
      for (const worker of workers) {
        worker.postMessage({
          type: 'START_MINING',
          ...data,
        });
      }

      this.logger.debug(
        `Started ${workers.length} workers for address ${address.substring(0, 20)}...`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start workers for address ${address.substring(0, 20)}: ${error.message}`,
      );
      throw error;
    }
  }

  stopMining() {
    this.running = false;
    
    // Parar todos os grupos de workers
    for (const workers of this.workerGroups.values()) {
      for (const worker of workers) {
        worker.postMessage({ type: 'STOP_MINING' });
      }
    }
  }

  async stopMiningForAddress(address: string) {
    // Obter workers para este endereço
    const workers = this.workerGroups.get(address);
    if (!workers) return;

    // Parar e terminar workers deste endereço
    for (const worker of workers) {
      worker.postMessage({ type: 'STOP_MINING' });
      await worker.terminate();
    }

    // Remover grupo de workers
    this.workerGroups.delete(address);
    
    // Log para debug
    this.logger.debug(`Terminated all workers for address ${address.substring(0, 20)}...`);
  }

  private handleSolutionFound(solution: any) {
    if (!this.running) return;
    
    // Parar todos os outros workers
    this.stopMining();
    
    // Emitir evento com a solução encontrada
    this.logger.log('Solution found:', solution);
    // TODO: Implementar lógica de callback para solução encontrada
  }

  private handleHashRate(workerId: number, hashRate: number) {
    this.logger.debug(`Worker ${workerId} hash rate: ${hashRate} H/s`);
  }

  async cleanup() {
    this.stopMining();
    
    // Terminar todos os workers em todos os grupos
    for (const workers of this.workerGroups.values()) {
      for (const worker of workers) {
        await worker.terminate();
      }
    }
    
    // Limpar grupos
    this.workerGroups.clear();
  }
}