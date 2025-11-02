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
    // Validar formato do nonce (16 caracteres hex)
    if (!/^[0-9a-fA-F]{16}$/.test(nonce)) {
      throw new HttpException(
        {
          message: 'Invalid nonce format - must be 16-character hex string',
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

    // Verificar se o challenge_id corresponde ao desafio atual
    if (challenge.challenge_id !== challengeId) {
      throw new NotFoundException(`Challenge not found: ${challengeId}`);
    }

    // Construir preimage
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

    // Salvar solução
    this.storageService.addSolution(address, challengeId, nonce, preimage);

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
   * Constrói o preimage conforme especificação do documento
   * Ordem: nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
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
    // Conforme documento: concatenar na ordem exata especificada
    return `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  }

  private generateServerSignature(preimage: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(preimage).digest('hex');
    return hash; // Em produção, usar assinatura real com chave privada do servidor
  }
}

