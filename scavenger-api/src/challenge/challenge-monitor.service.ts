import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { AutoMinerService } from '../auto-miner/auto-miner.service';

/**
 * Serviço para monitorar mudanças de challenge
 * Detecta quando a hora muda e o challenge muda
 */
@Injectable()
export class ChallengeMonitorService implements OnModuleInit {
  private readonly logger = new Logger(ChallengeMonitorService.name);
  private currentChallengeId: string | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly challengeService: ChallengeService,
    private readonly autoMinerService: AutoMinerService,
  ) {}

  onModuleInit() {
    // Inicializar challenge atual
    const challenge = this.challengeService.getCurrentChallenge();
    if (challenge.challenge) {
      this.currentChallengeId = challenge.challenge.challenge_id;
      this.logger.log(`📊 Challenge inicial: ${this.currentChallengeId}`);
    }

    // ✅ Monitorar mudanças a cada minuto
    this.startMonitoring();
  }

  /**
   * Inicia o monitoramento de mudanças de challenge
   */
  private startMonitoring() {
    // Verificar a cada minuto se o challenge mudou
    this.checkInterval = setInterval(() => {
      this.checkForChallengeChange();
    }, 60000); // 60 segundos

    // Verificar imediatamente
    this.checkForChallengeChange();

    this.logger.log('✅ Monitor de challenges iniciado (verifica a cada 60 segundos)');
  }

  /**
   * Verifica se o challenge mudou
   */
  private checkForChallengeChange() {
    try {
      const challenge = this.challengeService.getCurrentChallenge();
      
      if (challenge.code !== 'active' || !challenge.challenge) {
        return;
      }

      const newChallengeId = challenge.challenge.challenge_id;
      const newChallengeNumber = challenge.challenge.challenge_number;
      const newDay = challenge.challenge.day;

      // ✅ Verificar se mudou
      if (this.currentChallengeId && this.currentChallengeId !== newChallengeId) {
        const oldChallengeId = this.currentChallengeId;
        
        this.logger.log(
          `🔄 MUDANÇA DE CHALLENGE DETECTADA!\n` +
          `   Challenge anterior: ${oldChallengeId}\n` +
          `   Challenge atual: ${newChallengeId}\n` +
          `   Dia: ${newDay}, Número: ${newChallengeNumber}\n` +
          `   Hora: ${new Date().toISOString()}`
        );

        // Atualizar
        this.currentChallengeId = newChallengeId;

        // ✅ Notificar que mudou (isso já está sendo feito no auto-miner)
        // O auto-miner já detecta mudanças automaticamente
      } else if (!this.currentChallengeId) {
        // Primeira detecção
        this.currentChallengeId = newChallengeId;
        this.logger.log(`📊 Challenge detectado: ${newChallengeId}`);
      }

      // ✅ Verificar se está próximo de mudar (próximos 5 minutos)
      const nextChallenge = new Date(challenge.next_challenge_starts_at || Date.now());
      const now = new Date();
      const minutesUntilChange = Math.floor((nextChallenge.getTime() - now.getTime()) / 60000);
      
      if (minutesUntilChange <= 5 && minutesUntilChange > 0) {
        this.logger.log(
          `⏰ Challenge mudará em ${minutesUntilChange} minuto(s) ` +
          `(atual: ${newChallengeId})`
        );
      }
    } catch (error: any) {
      this.logger.error(`Erro ao verificar mudança de challenge: ${error.message}`);
    }
  }

  /**
   * Obtém informações sobre o challenge atual e mudanças
   */
  getChallengeStatus() {
    const challenge = this.challengeService.getCurrentChallenge();
    const challengeInfo = this.autoMinerService.getChallengeInfo();

    return {
      currentChallengeId: this.currentChallengeId,
      challenge: challenge.challenge,
      hasChanged: challengeInfo.hasChanged,
      lastChallengeId: challengeInfo.lastChallengeId,
      nextChangeAt: challenge.next_challenge_starts_at,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.log('⏸️  Monitor de challenges parado');
    }
  }
}

