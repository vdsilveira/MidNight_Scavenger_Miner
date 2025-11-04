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

    // ✅ Normalizar challenge_id: aceitar com ou sem ** prefixo
    // O browser pode enviar com ou sem asteriscos, mas usamos o formato da API (com **) no preimage
    const challengeIdWithoutAsterisks = challengeId.replace(/^\*\*/, '');

    // ✅ Validar formato do challenge_id (D##C##) - conforme teste
    if (!/^D\d{2}C\d{2}$/.test(challengeIdWithoutAsterisks)) {
      throw new HttpException(
        {
          message: 'Invalid challenge_id format - must be D##C## (e.g., D01C01)',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se o challenge_id corresponde ao desafio atual (comparar sem asteriscos)
    const challengeIdFromApi = challenge.challenge_id.replace(/^\*\*/, '');
    if (challengeIdFromApi !== challengeIdWithoutAsterisks) {
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
    // IMPORTANTE: Usar challenge.challenge_id COM asteriscos (como vem da API e como o browser usa)
    const preimage = this.buildPreimage(
      nonce,
      address,
      challenge.challenge_id, // COM ** (como o browser usa no preimage)
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
   * Constrói o preimage EXATAMENTE como o browser worker faz:
   * 1. Concatena todas as strings na ordem: nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
   * 2. O challenge_id deve vir COM ** (como a API retorna e como o browser usa)
   * 3. Depois essa string é codificada como UTF-8 para o hash
   * 
   * Conforme mine-session.work.js (linhas 148-156):
   * const preimage = [tryNonce, _address, _challengeId, _difficultyHex, 
   *                   _noPreMine, _latestSubmission, _noPreMineHour].join('');
   * const salt = new TextEncoder().encode(preimage);
   */
  private buildPreimage(
    nonce: string,
    address: string,
    challengeId: string, // COM ** (como vem da API)
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
  ): string {
    // ✅ Validar formatos antes de construir (conforme teste)
    if (nonce.length !== 16) {
      throw new Error(`Invalid nonce length: expected 16, got ${nonce.length}`);
    }
    // challengeId pode ter 6 caracteres (D##C##) ou 8 (**D##C##)
    const challengeIdWithoutAsterisks = challengeId.replace(/^\*\*/, '');
    if (challengeIdWithoutAsterisks.length !== 6 || !/^D\d{2}C\d{2}$/.test(challengeIdWithoutAsterisks)) {
      throw new Error(`Invalid challengeId format: ${challengeId} (expected **D##C## or D##C##)`);
    }
    if (difficulty.length !== 8) {
      throw new Error(`Invalid difficulty length: expected 8, got ${difficulty.length}`);
    }
    if (noPreMine.length !== 64) {
      throw new Error(`Invalid noPreMine length: expected 64, got ${noPreMine.length}`);
    }

    // ✅ Conforme browser worker: concatenar TODAS as strings na ordem exata (sem separadores)
    // O challenge_id DEVE incluir os asteriscos ** se presentes (como o browser usa)
    return `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  }

  private generateServerSignature(preimage: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(preimage).digest('hex');
    return hash; // Em produção, usar assinatura real com chave privada do servidor
  }
}

