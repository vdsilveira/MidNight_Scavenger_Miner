import { Injectable, Logger } from '@nestjs/common';
import { Rom } from 'ashmaize-web';

@Injectable()
export class AshmaizeWasmService {
  private readonly logger = new Logger(AshmaizeWasmService.name);
  private wasmDisabled = false;
  private romCache: Map<string, Rom> = new Map();

  private readonly NB_LOOPS = 8;
  private readonly NB_INSTRS = 256;
  private readonly PRE_SIZE = 16 * 1024 * 1024; // 16 MB (como no browser: 16 * MB)
  private readonly MIXING_NUMBERS = 4;
  private readonly ROM_SIZE = 1024 * 1024 * 1024; // 1 GB (como no browser: 1024 * MB)

  private getOrCreateRom(noPreMine: string): Rom {
    if (this.wasmDisabled) throw new Error('WASM disabled');

    if (this.romCache.has(noPreMine)) {
      return this.romCache.get(noPreMine)!;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(noPreMine)) {
      throw new Error(`Invalid no_pre_mine format: expected 64 hex chars`);
    }

    this.logger.log(`🔨 Building ROM for challenge ${noPreMine.slice(0, 16)}...`);
    // ✅ IMPORTANTE: no_pre_mine deve ser tratado como STRING UTF-8, não como hex bytes!
    // Conforme mine-session.work.js linha 82: builder.key(new TextEncoder().encode(no_pre_mine));
    const seed = new TextEncoder().encode(noPreMine);

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
      // ✅ IMPORTANTE: No browser, o preimage vem como STRING e é codificado aqui
      // Conforme getHexHash no mine-session.work.js: new TextEncoder().encode(preimage)
      // Se já vier como Uint8Array, usar diretamente; se for string, codificar como UTF-8
      const bytes = preimage instanceof Uint8Array ? preimage : new TextEncoder().encode(preimage);
      const hashBytes = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
      
      // ✅ Converter bytes para hex string EXATAMENTE como no browser (getHexHash linha 93-98)
      let hexString = '';
      for (let i = 0; i < hashBytes.length; i++) {
        const byte = hashBytes[i];
        hexString += byte.toString(16).padStart(2, '0');
      }
      
      return this.checkDifficulty(hexString, difficulty);
    } catch (e: any) {
      this.logger.error(`❌ Error validating solution: ${e.message}`);
      this.wasmDisabled = true;
      throw e;
    }
  }

  computeHash(preimage: string | Uint8Array, noPreMine: string): string {
    const rom = this.getOrCreateRom(noPreMine);
    // ✅ IMPORTANTE: No browser, o preimage vem como STRING e é codificado aqui
    const bytes = preimage instanceof Uint8Array ? preimage : new TextEncoder().encode(preimage);
    const hashBytes = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
    
    // ✅ Converter bytes para hex string EXATAMENTE como no browser (getHexHash linha 93-98)
    let hexString = '';
    for (let i = 0; i < hashBytes.length; i++) {
      const byte = hashBytes[i];
      hexString += byte.toString(16).padStart(2, '0');
    }
    return hexString;
  }

  private checkDifficulty(hash: string, difficulty: string): boolean {
    // ✅ Usar EXATAMENTE a mesma lógica do browser (mine-session.work.js)
    if (hash.length < 8 || difficulty.length !== 8) return false;
    const hashPrefix = hash.slice(0, 8);
    const hashValue = parseInt(hashPrefix, 16);
    const target = parseInt(difficulty, 16);
    // Usar exatamente a mesma comparação do browser
    return (hashValue | target) === target;
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
