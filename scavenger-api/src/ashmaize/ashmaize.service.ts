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

  // ✅ Getter público para compatibilidade com auto-miner
  get wasmServiceForCleanup(): AshmaizeWasmService {
    return this.wasm;
  }

  async validateSolution(
    preimage: string,
    noPreMine: string,
    difficulty: string,
  ): Promise<boolean> {
    // ✅ Try WASM first (global ROM)
    if (this.useWasm) {
      try {
        return this.wasm.validateSolution(preimage, noPreMine, difficulty);
      } catch {
        this.logger.warn('WASM failed — switching to native');
        this.useWasm = false;
      }
    }

    // ✅ Native fallback (still uses noPreMine for now until Rust patch)
    if (this.native) {
      return await this.native.validateSolution(preimage, noPreMine, difficulty);
    }

    // ✅ Final fallback simulation
    return this.simulate(preimage, difficulty);
  }

  async computeHash(preimage: string, noPreMine: string): Promise<string> {
    if (this.useWasm) {
      try {
        return this.wasm.computeHash(preimage, noPreMine);
      } catch {
        this.useWasm = false;
      }
    }
    if (this.native) return this.native.computeHash(preimage, noPreMine);
    return this.simHash(preimage);
  }

  private simHash(preimage: string): string {
    const h1 = crypto.createHash('sha256').update(preimage).digest();
    const h2 = crypto.createHash('sha256').update(h1).digest();
    return Buffer.concat([h1, h2]).toString('hex');
  }

  private simulate(preimage: string, difficulty: string): boolean {
    const hash = this.simHash(preimage);
    const prefix = parseInt(hash.substring(0, 8), 16) >>> 0;
    const diff = parseInt(difficulty, 16) >>> 0;
    const zeroMask = (~diff) >>> 0;
    return (prefix & zeroMask) === 0;
  }
}
