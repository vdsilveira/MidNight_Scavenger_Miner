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
    preimage: string | Uint8Array,
    noPreMine: string,
    difficulty: string,
  ): Promise<boolean> {
    // ✅ IMPORTANTE: No browser, o preimage é passado como STRING e é codificado DENTRO do getHexHash
    // Não devemos codificar aqui - deixar o wasm fazer isso (como no browser)

    let valid = false;

    if (this.useWasm) {
      try {
        // ✅ Passar preimage diretamente (string ou Uint8Array) - o wasm vai codificar se necessário
        valid = this.wasm.validateSolution(preimage, noPreMine, difficulty);

        // Opcional: log de debug
        const hash = await this.computeHash(preimage, noPreMine);
        // this.logger.debug(`[DEBUG HASH - WASM] preimage=${preimage}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

        return valid;
      } catch (err) {
        this.logger.warn('WASM falhou — alternando para Native');
        this.useWasm = false;
      }
    }

    if (this.native) {
      // Para Native, converter para string se necessário
      const preimageStr = preimage instanceof Uint8Array ? new TextDecoder().decode(preimage) : preimage;
      valid = await this.native.validateSolution(preimageStr, noPreMine, difficulty);

      // Opcional: log de debug Native
      const hash = await this.computeHash(preimage, noPreMine);
      this.logger.debug(`[DEBUG HASH - Native] preimage=${preimageStr}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

      return valid;
    }

    // Fallback de simulação
    const preimageStr = preimage instanceof Uint8Array ? new TextDecoder().decode(preimage) : preimage;
    valid = this.simulate(preimageStr, difficulty);

    // Log fallback
    const hash = this.simHash(preimageStr);
    this.logger.debug(`[DEBUG HASH - Sim] preimage=${preimageStr}, hash=${hash}, difficulty=${difficulty}, meetsDifficulty=${valid}`);

    return valid;
  }

  /**
   * Computa hash AshMaize para um preimage
   * @param preimage string ou Uint8Array do preimage
   * @param noPreMine string hex do desafio
   */
  async computeHash(preimage: string | Uint8Array, noPreMine: string): Promise<string> {
    if (this.useWasm) {
      try {
        // ✅ Passar preimage diretamente (string ou Uint8Array) - o wasm vai codificar se necessário
        return this.wasm.computeHash(preimage, noPreMine);
      } catch {
        this.useWasm = false;
      }
    }
    if (this.native) {
      // Native espera string
      const preimageStr = preimage instanceof Uint8Array ? new TextDecoder().decode(preimage) : preimage;
      return this.native.computeHash(preimageStr, noPreMine);
    }
    // Fallback de simulação
    const preimageStr = preimage instanceof Uint8Array ? new TextDecoder().decode(preimage) : preimage;
    return this.simHash(preimageStr);
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
