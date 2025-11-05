import { Injectable, HttpException, HttpStatus, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';
import { StorageService } from '../storage/storage.service';
import { ChallengeService } from '../challenge/challenge.service';
import { AshmaizeService } from '../ashmaize/ashmaize.service';

@Injectable()
export class SolutionService {
  private readonly logger = new Logger(SolutionService.name);

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
    const challengeResponse = await this.challengeService.getCurrentChallenge();

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
    const preimage = this.buildPreimage(
      nonce,
      address,
      challenge.challenge_id, // COM ** (como o browser usa no preimage)
      challenge.difficulty,
      challenge.no_pre_mine,
      challenge.latest_submission,
      challenge.no_pre_mine_hour,
    );

    // Validar solução usando AshMaize (retorna boolean no seu código original)
    const isValid = await this.ashmaizeService.validateSolution(
      preimage,
      challenge.no_pre_mine,
      challenge.difficulty,
    );

    if (!isValid) {
      this.logger.warn(`Solução inválida localmente para ${address.substring(0, 20)}... nonce=${nonce}`);
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

    // -----------------------
    // Enviar para Midnight (com logs)
    // -----------------------
    const url = `https://scavenger.prod.gd.midnighttge.io/solution/${encodeURIComponent(address)}/${encodeURIComponent(challenge.challenge_id)}/${encodeURIComponent(nonce)}`;

    this.logger.log(`📡 Enviando solução para Midnight...`);
    this.logger.debug(` - URL: ${url}`);
    this.logger.debug(` - preimage (len=${preimage.length}): ${preimage.substring(0, 120)}${preimage.length > 120 ? '... (truncated)' : ''}`);

    try {
  const response = await axios.post(url, {}); // body vazio conforme docs

  this.logger.log(`✅ Midnight respondeu com receipt.`);
  this.logger.debug(
    `📄 Midnight response: ${JSON.stringify(response.data, null, 2)}`
  );

  // Salvar solução local somente após confirmação
  this.storageService.addSolution(address, challengeId, nonce, preimage);

  return response.data;

} catch (err: any) {
  const axiosData = err?.response?.data;
  const msg = axiosData?.message || err?.message || String(err);

  // ✅ Tratamento: solução já enviada — continuar mineração sem crash
  if (msg.includes("Solution already exists")) {
    this.logger.warn(
      `⚠️ Solução já existe na Midnight — ignorando e continuando mineração`
    );

    // opcionalmente marcar como duplicada
    this.storageService.addSolution(address, challengeId, nonce, preimage);

    return {
      status: "duplicate",
      message: "Solution already exists — continue mining",
    };
  }

  this.logger.error(`❌ Erro ao enviar solução para Midnight: ${msg}`);

  this.logger.debug(
    `Midnight error detail: ${JSON.stringify(axiosData ?? err, null, 2)}`
  );

  throw new HttpException(
    {
      message: 'Failed to send solution to Midnight Scavenger API',
      midnight_error: axiosData ?? err?.message ?? err,
      statusCode: HttpStatus.BAD_GATEWAY,
    },
    HttpStatus.BAD_GATEWAY,
  );
}

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
