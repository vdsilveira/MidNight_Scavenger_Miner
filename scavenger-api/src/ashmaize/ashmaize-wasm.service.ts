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
    if (this.romCache.has(noPreMine)) {
      return this.romCache.get(noPreMine)!;
    }

    this.logger.log(`🔨 Building ROM for challenge ${noPreMine}...`);
    const romSeed = Buffer.from(noPreMine, 'hex');

    try {
      const builder = Rom.builder();
      builder.key(romSeed);
      builder.size(this.ROM_SIZE);
      builder.gen_two_steps(this.PRE_SIZE, this.MIXING_NUMBERS);
      const rom = builder.build();
      this.logger.log(`✅ ROM created for challenge ${noPreMine}`);
      this.romCache.set(noPreMine, rom);
      return rom;
    } catch (error: any) {
      this.wasmDisabled = true;
      this.logger.error(`❌ WASM failed (memory limit): ${error.message}`);
      throw new Error('WASM ROM generation failed');
    }
  }




  validateSolution(preimage: string, noPreMine: string, difficulty: string): boolean {
    if (this.wasmDisabled) throw new Error('WASM disabled');

    try {
      const rom = this.getOrCreateRom(noPreMine);
      const bytes = new TextEncoder().encode(preimage);
      const hash = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
      const hex = Buffer.from(hash).toString('hex');
      return this.checkDifficulty(hex, difficulty);
    } catch (e) {
      this.wasmDisabled = true;
      throw e;
    }
  }

  computeHash(preimage: string, noPreMine: string): string {
    const rom = this.getOrCreateRom(noPreMine);
    const bytes = new TextEncoder().encode(preimage);
    const hash = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
    return Buffer.from(hash).toString('hex');
  }

  private checkDifficulty(hash: string, difficulty: string): boolean {
    const hashPrefix = hash.substring(0, 8);
    const hashNum = parseInt(hashPrefix, 16) >>> 0;
    const diffNum = parseInt(difficulty, 16) >>> 0;
    const zeroMask = (~diffNum) >>> 0;
    return (hashNum & zeroMask) === 0;
  }

  /** 
   * Limpa ROMs expiradas (stub temporário)
   * @param noPreMine Challenge ou seed usada para identificar ROMs expiradas
   */
  clearExpiredRoms(noPreMine: string): void {
    this.logger.log(`🔄 Cleaning expired ROMs for noPreMine: ${noPreMine}`);
    // Por enquanto, apenas log; futuramente podemos integrar Rust WASM
  }
}
