import { Injectable, Logger } from '@nestjs/common';
import { Rom } from 'ashmaize-web';

@Injectable()
export class AshmaizeWasmService {
  private readonly logger = new Logger(AshmaizeWasmService.name);
  private wasmDisabled = false;
  private romCache: Map<string, Rom> = new Map();

  private readonly NB_LOOPS = 8;
  private readonly NB_INSTRS = 256;
  private readonly PRE_SIZE = 16777216; 
  private readonly MIXING_NUMBERS = 4;
  private readonly ROM_SIZE = 1073741824; 

  private getOrCreateRom(noPreMine: string): Rom {
    if (this.wasmDisabled) throw new Error('WASM disabled');

    if (this.romCache.has(noPreMine)) {
      return this.romCache.get(noPreMine)!;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(noPreMine)) {
      throw new Error(`Invalid no_pre_mine format: expected 64 hex chars`);
    }

    this.logger.log(`🔨 Building ROM for challenge ${noPreMine.slice(0, 16)}...`);
    const seed = Buffer.from(noPreMine, 'hex');

    const builder = Rom.builder();
    builder.key(seed);
    builder.size(this.ROM_SIZE);
    builder.gen_two_steps(this.PRE_SIZE, this.MIXING_NUMBERS);

    const rom = builder.build();
    this.romCache.set(noPreMine, rom);
    return rom;
  }

  validateSolution(preimage: string | Uint8Array, noPreMine: string, difficulty: string): boolean {
    try {
      const rom = this.getOrCreateRom(noPreMine);
      const bytes = preimage instanceof Uint8Array ? preimage : new TextEncoder().encode(preimage);
      const hashBytes = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
      const hex = Buffer.from(hashBytes).toString('hex');
      return this.checkDifficulty(hex, difficulty);
    } catch (e: any) {
      this.logger.error(`❌ Error validating solution: ${e.message}`);
      this.wasmDisabled = true;
      throw e;
    }
  }

  computeHash(preimage: string | Uint8Array, noPreMine: string): string {
    const rom = this.getOrCreateRom(noPreMine);
    const bytes = preimage instanceof Uint8Array ? preimage : new TextEncoder().encode(preimage);
    const hashBytes = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
    return Buffer.from(hashBytes).toString('hex');
  }

  private checkDifficulty(hash: string, difficulty: string): boolean {
    if (hash.length < 8 || difficulty.length !== 8) return false;
    const hashNum = parseInt(hash.substring(0, 8), 16) >>> 0;
    const diffNum = parseInt(difficulty, 16) >>> 0;
    const zeroMask = (~diffNum) >>> 0;
    return (hashNum & zeroMask) === 0;
  }

  clearExpiredRoms(activeNoPreMine: string): void {
    for (const key of [...this.romCache.keys()]) {
      if (key !== activeNoPreMine) {
        this.romCache.delete(key);
      }
    }
    this.logger.log(`🧹 Cleaned ROM cache; kept ${activeNoPreMine.slice(0, 16)}`);
  }
}
