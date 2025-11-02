import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';

/**
 * Serviço para rastrear e detectar quando challenges foram resolvidos
 */
@Injectable()
export class SolutionStatsService {
  private readonly logger = new Logger(SolutionStatsService.name);
  private lastSolutionCount = 0;

  constructor(
    private readonly storageService: StorageService,
  ) {}

  /**
   * Verifica se houve novas soluções submetidas
   */
  checkForNewSolutions(): {
    hasNew: boolean;
    totalSolutions: number;
    newSolutions: number;
  } {
    const allSolutions = this.storageService.getAllSolutions();
    let totalSolutions = 0;
    
    for (const [_, solutions] of allSolutions.entries()) {
      totalSolutions += solutions.length;
    }

    const hasNew = totalSolutions > this.lastSolutionCount;
    const newSolutions = hasNew ? totalSolutions - this.lastSolutionCount : 0;
    
    if (hasNew) {
      this.logger.log(
        `🎉 ${newSolutions} nova(s) solução(ões) detectada(s)! ` +
        `Total: ${totalSolutions}`
      );
      this.lastSolutionCount = totalSolutions;
    }

    return {
      hasNew,
      totalSolutions,
      newSolutions,
    };
  }

  /**
   * Obtém estatísticas de um challenge específico
   */
  getChallengeStats(challengeId: string) {
    const solutions = this.storageService.getSolutionsByChallenge(challengeId);
    const addresses = this.storageService.getAddressesWithSolutionForChallenge(challengeId);
    
    const isResolved = solutions.length > 0;
    const firstSolution = solutions.length > 0 ? solutions[solutions.length - 1] : null;
    const lastSolution = solutions.length > 0 ? solutions[0] : null;

    return {
      challengeId,
      resolved: isResolved,
      totalSolutions: solutions.length,
      uniqueAddresses: addresses.length,
      addresses,
      firstSolutionAt: firstSolution?.timestamp.toISOString() || null,
      lastSolutionAt: lastSolution?.timestamp.toISOString() || null,
      solutions: solutions.map(s => ({
        address: s.address,
        nonce: s.nonce,
        timestamp: s.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Obtém lista de challenges resolvidos
   */
  getResolvedChallenges(): string[] {
    const allSolutions = this.storageService.getAllSolutions();
    const resolvedChallenges = new Set<string>();

    for (const [_, solutions] of allSolutions.entries()) {
      for (const solution of solutions) {
        resolvedChallenges.add(solution.challengeId);
      }
    }

    return Array.from(resolvedChallenges).sort();
  }

  /**
   * Verifica se o challenge atual foi resolvido
   */
  isCurrentChallengeResolved(currentChallengeId: string): boolean {
    return this.storageService.hasSolutionsForChallenge(currentChallengeId);
  }
}

