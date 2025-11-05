import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AshmaizeWorkerService } from '../ashmaize/ashmaize-worker.service';

export interface MiningResult {
  nonce: string;
  hash: string;
  preimage: string;
}

export interface MiningParams {
  noPreMine: string;
  noPreMineHour: string;
  difficultyHex: string;
  challengeId: string;
  address: string;
  latestSubmission: string;
}

@Injectable()
export class MiningService implements OnModuleDestroy {
  private readonly logger = new Logger(MiningService.name);
  private currentTasks: Map<string, MiningParams> = new Map();
  
  constructor(
    private readonly workerService: AshmaizeWorkerService
  ) {}

  async startMining(params: MiningParams): Promise<void> {
    const existingTask = this.currentTasks.get(params.address);
    if (existingTask) {
      // Se já existe mineração para este endereço, apenas atualiza os parâmetros
      this.currentTasks.set(params.address, params);
      return;
    }

    // Inicia nova mineração para este endereço
    this.currentTasks.set(params.address, params);
    await this.workerService.startMining(params);
  }

  async stopMining(address?: string): Promise<void> {
    if (address) {
      // Para mineração de um endereço específico
      this.currentTasks.delete(address);
      await this.workerService.stopMiningForAddress(address);
    } else {
      // Para toda mineração
      this.currentTasks.clear();
      this.workerService.stopMining();
    }
  }

  async onModuleDestroy() {
    await this.stopMining();
  }
}