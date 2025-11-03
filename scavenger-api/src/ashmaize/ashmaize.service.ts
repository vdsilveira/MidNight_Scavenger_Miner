import { Injectable, Logger } from '@nestjs/common';
import { AshmaizeWasmService } from './ashmaize-wasm.service';
import { AshmaizeNativeService } from './ashmaize-native.service';
import * as crypto from 'crypto';

@Injectable()
export class AshmaizeService {
  private readonly logger = new Logger(AshmaizeService.name);
  private useWasm = true;

  constructor(
    private readonly wasm: AshmaizeWasmService,
    private readonly native?: AshmaizeNativeService,
  ) {}

  // Getter público para compatibilidade com AutoMiner
  get wasmServiceForCleanup(): AshmaizeWasmService {
    return this.wasm;
  }

  /**
   * Valida uma solução (preimage) para um desafio AshMaize
   * @param preimage string do preimage
   * @param noPreMine string hex do desafio
   * @param difficulty string hex da dificuldade
   */
  async validateSolution(
    preimage: string,
    noPreMine: string,
    difficulty: string,
  ): Promise<boolean> {
    // Converte preimage para bytes UTF-8 para WASM
    const preimageBytes = new TextEncoder().encode(preimage);

    let valid = false;

    if (this.useWasm) {
      try {
        valid = this.wasm.validateSolution(preimageBytes, noPreMine, difficulty);

        // Opcional: log de debug
        const hash = await this.computeHash(preimageBytes, noPreMine);
        // this.logger.debug(`[DEBUG HASH - WASM] preimage=${preimage}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

        return valid;
      } catch (err) {
        this.logger.warn('WASM falhou — alternando para Native');
        this.useWasm = false;
      }
    }

    if (this.native) {
      // Para Native, podemos enviar string diretamente
      valid = await this.native.validateSolution(preimage, noPreMine, difficulty);

      // Opcional: log de debug Native
      const hash = await this.computeHash(new TextEncoder().encode(preimage), noPreMine);
      this.logger.debug(`[DEBUG HASH - Native] preimage=${preimage}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

      return valid;
    }

    // Fallback de simulação
    valid = this.simulate(preimage, difficulty);

    // Log fallback
    const hash = this.simHash(preimage);
    this.logger.debug(`[DEBUG HASH - Sim] preimage=${preimage}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

    return valid;
  }

  /**
   * Computa hash AshMaize para um preimage em bytes
   * @param preimageBytes Uint8Array do preimage
   * @param noPreMine string hex do desafio
   */
  async computeHash(preimageBytes: Uint8Array, noPreMine: string): Promise<string> {
    if (this.useWasm) {
      try {
        return this.wasm.computeHash(preimageBytes, noPreMine);
      } catch {
        this.useWasm = false;
      }
    }
    if (this.native) {
      // Native espera string, então convertemos bytes de volta para string UTF-8
      return this.native.computeHash(new TextDecoder().decode(preimageBytes), noPreMine);
    }
    // Fallback de simulação
    return this.simHash(new TextDecoder().decode(preimageBytes));
  }

  // ======== MÉTODOS AUXILIARES ======== //

  /** Simula hash SHA-256 duplo */
  private simHash(preimage: string): string {
    const h1 = crypto.createHash('sha256').update(preimage).digest();
    const h2 = crypto.createHash('sha256').update(h1).digest();
    return Buffer.concat([h1, h2]).toString('hex');
  }

  /** Simula validação de dificuldade */
  private simulate(preimage: string, difficulty: string): boolean {
    const hash = this.simHash(preimage);
    const prefix = parseInt(hash.substring(0, 8), 16) >>> 0;
    const diff = parseInt(difficulty, 16) >>> 0;
    const zeroMask = (~diff) >>> 0;
    return (prefix & zeroMask) === 0;
  }
}
