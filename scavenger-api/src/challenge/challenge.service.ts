import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ChallengeResponse } from './types';

@Injectable()
export class ChallengeService {
  private readonly apiUrl = 'https://scavenger.prod.gd.midnighttge.io/challenge';
  private lastChallenge: ChallengeResponse | null = null;
  private lastFetchTime: number = 0;
  private readonly cacheDuration = 10000; // 10 segundos de cache

  async getCurrentChallenge(): Promise<ChallengeResponse> {
    const now = Date.now();
    
    // Usar cache se disponível e não expirado
    if (this.lastChallenge && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.lastChallenge;
    }

    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as ChallengeResponse;
      
      // Atualizar cache
      this.lastChallenge = data;
      this.lastFetchTime = now;
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar challenge da API:', error);
      // Se tiver cache, usar como fallback mesmo que expirado
      if (this.lastChallenge) {
        return this.lastChallenge;
      }
      throw error;
    }
  }


}

