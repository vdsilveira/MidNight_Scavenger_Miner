import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ChallengeService {
  private readonly maxDay = 21;
  private readonly totalChallenges = 504;
  private readonly challengesPerDay = 24;

  // ✅ Seed fixa para ROM — NÃO depende do challenge
  private readonly ROM_SEED = "MIDNIGHT_SCAVENGER_MINE_ROM_v1";

  getCurrentChallenge() {
    const nowLocal = new Date();

    // Converte para UTC de forma consistente
    const nowUTC = new Date(Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      nowLocal.getUTCHours(),
      nowLocal.getUTCMinutes(),
      nowLocal.getUTCSeconds(),
      nowLocal.getUTCMilliseconds()
    ));

    const startDate = new Date(Date.UTC(2025, 9, 30, 0, 0, 0));
    const endDate = new Date(Date.UTC(2025, 10, 20, 23, 59, 59));

    if (nowUTC < startDate) {
      return {
        code: 'before',
        starts_at: startDate.toISOString(),
      };
    }

    if (nowUTC > endDate) {
      return {
        code: 'after',
      };
    }

    const daysSinceStart = Math.floor(
      (nowUTC.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const currentDay = Math.min(Math.max(1, daysSinceStart), this.maxDay);
    const challengeNumber = this.calculateChallengeNumber(nowUTC);

    const challengeId = `D${String(currentDay).padStart(2, '0')}C${String(challengeNumber).padStart(2, '0')}`;

    // ✅ no_pre_mine fixo
    const noPreMine = this.generateNoPreMine(challengeId);

    const latestSubmission = new Date(startDate.getTime() + (currentDay - 1) * 24 * 60 * 60 * 1000);
    latestSubmission.setUTCHours(23, 59, 59, 0);

    const challenge = {
      challenge_id: challengeId,
      day: currentDay,
      challenge_number: challengeNumber,
      issued_at: nowUTC.toISOString(),
      latest_submission: latestSubmission.toISOString(),
      difficulty: this.calculateDifficulty(currentDay),
      no_pre_mine: noPreMine,
      no_pre_mine_hour: Math.floor(nowUTC.getTime() / 1000).toString(),
    };

    const nextChallengeStartsAt = new Date(nowUTC);
    nextChallengeStartsAt.setUTCHours(20, 0, 0, 0);

    if (nextChallengeStartsAt <= nowUTC) {
      nextChallengeStartsAt.setUTCDate(nextChallengeStartsAt.getUTCDate() + 1);
      nextChallengeStartsAt.setUTCHours(20, 0, 0, 0);
    }

    return {
      code: 'active',
      challenge,
      mining_period_ends: endDate.toISOString(),
      max_day: this.maxDay,
      total_challenges: this.totalChallenges,
      current_day: currentDay,
      next_challenge_starts_at: nextChallengeStartsAt.toISOString(),
    };
  }

  private calculateChallengeNumber(nowUTC: Date): number {
    const hours = nowUTC.getUTCHours(); // ✅ usa UTC
    return Math.min(Math.floor(hours / 1) + 1, this.challengesPerDay);
  }

  /**
   * Calcula a dificuldade baseado no dia
   * ✅ Conforme teste de validação: difficulty = min(0x000000FF + (day * 0x10), 0xFFFFFFFF)
   */
  private calculateDifficulty(day: number): string {
    if (day < 1 || day > this.maxDay) {
      throw new Error(`Invalid day: ${day} (must be between 1 and ${this.maxDay})`);
    }

    const baseDifficulty = 0x000000ff;
    const difficulty = Math.min(baseDifficulty + (day * 0x10), 0xffffffff);
    const hex = difficulty.toString(16).padStart(8, '0').toUpperCase();
    
    // ✅ Validar formato (8 hex chars, maiúsculas) - conforme teste
    if (hex.length !== 8 || !/^[0-9A-F]{8}$/.test(hex)) {
      throw new Error(`Invalid difficulty format: ${hex}`);
    }
    
    return hex;
  }

  /**
   * Gera no_pre_mine deterministicamente baseado no challenge_id
   * ✅ Sempre retorna 64 caracteres hex (32 bytes) - conforme teste de validação
   */
  private generateNoPreMine(challengeId: string): string {
    // ✅ Validar formato do challenge_id antes de gerar
    if (!/^D\d{2}C\d{2}$/.test(challengeId)) {
      throw new Error(`Invalid challengeId format: ${challengeId}`);
    }

    const hash = crypto
      .createHash('sha256')
      .update(`${this.ROM_SEED}:${challengeId}`)
      .digest('hex');
    
    // ✅ Garantir que sempre retorna 64 caracteres (conforme teste)
    if (hash.length !== 64) {
      throw new Error(`Generated no_pre_mine has invalid length: ${hash.length}, expected 64`);
    }
    
    return hash;
  }
}

