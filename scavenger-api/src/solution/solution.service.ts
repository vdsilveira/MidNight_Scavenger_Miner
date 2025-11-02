import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { ChallengeService } from '../challenge/challenge.service';
import { AshmaizeService } from '../ashmaize/ashmaize.service';

@Injectable()
export class SolutionService {
  constructor(
    private readonly storageService: StorageService,
    private readonly challengeService: ChallengeService,
    private readonly ashmaizeService: AshmaizeService,
  ) {}

  async submitSolution(address: string, challengeId: string, nonce: string) {
    // ✅ Validar formato do nonce (16 caracteres hex) - conforme teste
    if (!/^[0-9a-fA-F]{16}$/.test(nonce)) {
      throw new HttpException(
        {
          message: 'Invalid nonce format - must be 16-character hex string (64 bits)',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se o endereço está registrado
    if (!this.storageService.isRegistered(address)) {
      throw new HttpException(
        {
          message: 'Solution validation failed: Address is not registered',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Obter o desafio atual
    const challengeResponse = this.challengeService.getCurrentChallenge();
    
    if (challengeResponse.code !== 'active') {
      throw new HttpException(
        {
          code: challengeResponse.code,
          ...(challengeResponse.code === 'before' && { starts_at: challengeResponse.starts_at }),
        },
        challengeResponse.code === 'before' ? HttpStatus.OK : HttpStatus.OK,
      );
    }

    if (!challengeResponse.challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const challenge = challengeResponse.challenge;

    // ✅ Validar formato do challenge_id (D##C##) - conforme teste
    if (!/^D\d{2}C\d{2}$/.test(challengeId)) {
      throw new HttpException(
        {
          message: 'Invalid challenge_id format - must be D##C## (e.g., D01C01)',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se o challenge_id corresponde ao desafio atual
    if (challenge.challenge_id !== challengeId) {
      throw new NotFoundException(`Challenge not found: ${challengeId}`);
    }

    // ✅ Validar formato do no_pre_mine (64 hex chars) - conforme teste
    if (!/^[0-9a-fA-F]{64}$/.test(challenge.no_pre_mine)) {
      throw new HttpException(
        {
          message: 'Invalid no_pre_mine format from challenge - must be 64-character hex string (32 bytes)',
          error: 'Internal Server Error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // ✅ Validar formato da dificuldade (8 hex chars) - conforme teste
    if (!/^[0-9A-F]{8}$/.test(challenge.difficulty)) {
      throw new HttpException(
        {
          message: 'Invalid difficulty format from challenge - must be 8-character hex string',
          error: 'Internal Server Error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // ✅ Construir preimage (conforme especificação Midnight)
    const preimage = this.buildPreimage(
      nonce,
      address,
      challenge.challenge_id,
      challenge.difficulty,
      challenge.no_pre_mine,
      challenge.latest_submission,
      challenge.no_pre_mine_hour,
    );

    // Validar solução usando AshMaize
    const isValid = await this.ashmaizeService.validateSolution(
      preimage,
      challenge.no_pre_mine,
      challenge.difficulty,
    );

    if (!isValid) {
      throw new HttpException(
        {
          message: 'Solution validation failed: Solution does not meet difficulty',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se ainda está dentro do prazo
    const now = new Date();
    const latestSubmission = new Date(challenge.latest_submission);
    if (now > latestSubmission) {
      throw new HttpException(
        {
          message: 'Solution validation failed: Submission deadline has passed',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ Salvar solução
    this.storageService.addSolution(address, challengeId, nonce, preimage);
    
    // ✅ Log quando challenge é resolvido e submetido
    console.log(
      `🎉 SOLUÇÃO SUBMETIDA!\n` +
      `   Challenge: ${challengeId}\n` +
      `   Endereço: ${address.substring(0, 20)}...\n` +
      `   Nonce: ${nonce}\n` +
      `   Timestamp: ${new Date().toISOString()}`
    );

    // Gerar crypto_receipt
    const timestamp = new Date();
    const receiptPreimage = `${preimage}${timestamp.toISOString()}`;
    const signature = this.generateServerSignature(receiptPreimage);

    return {
      crypto_receipt: {
        preimage: receiptPreimage,
        timestamp: timestamp.toISOString(),
        signature,
      },
    };
  }

  /**
   * Constrói o preimage conforme especificação Midnight
   * Ordem: nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
   * 
   * ✅ Conforme teste de validação: todos os componentes devem estar na ordem exata
   * ✅ Sem separadores: concatenação direta sem espaços ou caracteres especiais
   */
  private buildPreimage(
    nonce: string,
    address: string,
    challengeId: string,
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
  ): string {
    // ✅ Validar formatos antes de construir (conforme teste)
    if (nonce.length !== 16) {
      throw new Error(`Invalid nonce length: expected 16, got ${nonce.length}`);
    }
    if (challengeId.length !== 6 || !/^D\d{2}C\d{2}$/.test(challengeId)) {
      throw new Error(`Invalid challengeId format: ${challengeId}`);
    }
    if (difficulty.length !== 8) {
      throw new Error(`Invalid difficulty length: expected 8, got ${difficulty.length}`);
    }
    if (noPreMine.length !== 64) {
      throw new Error(`Invalid noPreMine length: expected 64, got ${noPreMine.length}`);
    }

    // ✅ Conforme especificação Midnight: concatenar na ordem exata (sem separadores)
    return `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  }

  private generateServerSignature(preimage: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(preimage).digest('hex');
    return hash; // Em produção, usar assinatura real com chave privada do servidor
  }
}

