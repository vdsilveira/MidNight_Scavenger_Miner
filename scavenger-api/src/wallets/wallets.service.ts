import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { AutoMinerService } from '../auto-miner/auto-miner.service';

@Injectable()
export class WalletsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly autoMinerService: AutoMinerService,
  ) {}

  getAllWallets() {
    // Obter todos os endereços registrados
    const registeredAddresses = this.storageService.getAllRegisteredAddresses();
    const allSolutions = this.storageService.getAllSolutions();
    
    // Obter endereços que estão minerando atualmente
    const activeMiningAddresses = this.autoMinerService.getActiveAddressesSet();
    
    // Criar conjunto de todos os endereços (registrados + com soluções)
    const allAddresses = new Set<string>();
    for (const address of registeredAddresses.keys()) {
      allAddresses.add(address);
    }
    for (const address of allSolutions.keys()) {
      allAddresses.add(address);
    }
    
    const wallets = Array.from(allAddresses).map((address) => {
      const solutions = this.storageService.getSolutionsForAddress(address);
      const submissionsCount = solutions.length;
      
      // Determinar status: mining > submitted > pending
      let status: 'mining' | 'submitted' | 'pending';
      if (activeMiningAddresses.has(address)) {
        status = 'mining';
      } else if (submissionsCount > 0) {
        status = 'submitted';
      } else {
        status = 'pending';
      }
      
      return {
        id: `wallet-${address.substring(0, 10)}`,
        address,
        pubkey: this.storageService.getPubkey(address) || '',
        submissions: submissionsCount,
        status,
        nightEarned: (submissionsCount * 32.005).toFixed(3),
        lastSubmission: solutions.length > 0 ? solutions[0].timestamp.toISOString() : null,
      };
    });
    
    return {
      wallets,
      total: wallets.length,
    };
  }

  getStats() {
    const allSolutions = this.storageService.getAllSolutions();
    const registeredAddresses = this.storageService.getAllRegisteredAddresses();
    
    let totalSubmissions = 0;
    const addresses = new Set<string>();
    
    for (const [address, solutions] of allSolutions.entries()) {
      totalSubmissions += solutions.length;
      addresses.add(address);
    }

    // Contar endereços registrados (mesmo sem soluções)
    for (const address of registeredAddresses.keys()) {
      addresses.add(address);
    }

    // Calcular NIGHT (mock - em produção usar taxa real)
    const nightRate = 32.005; // Por solução (mock)
    const totalNight = totalSubmissions * nightRate;

    return {
      totalWallets: addresses.size,
      totalSubmissions,
      totalNightEarned: totalNight,
      addresses: Array.from(addresses),
    };
  }

  getRecentActivity() {
    const allSolutions = this.storageService.getAllSolutions();
    const recentSolutions: Array<{
      address: string;
      challengeId: string;
      timestamp: string;
      nonce: string;
    }> = [];

    // Pegar as soluções mais recentes (últimas 20)
    for (const [address, solutions] of allSolutions.entries()) {
      for (const solution of solutions) {
        recentSolutions.push({
          address,
          challengeId: solution.challengeId,
          timestamp: solution.timestamp.toISOString(),
          nonce: solution.nonce,
        });
      }
    }

    // Ordenar por timestamp (mais recente primeiro)
    recentSolutions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      recentSolutions: recentSolutions.slice(0, 20), // Últimas 20 soluções
      totalSolutions: recentSolutions.length,
    };
  }
}

