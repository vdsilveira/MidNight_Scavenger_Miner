import { Injectable, Logger } from '@nestjs/common';
import { Rom } from 'ashmaize-web';

@Injectable()
export class AshmaizeWasmService {
  private readonly logger = new Logger(AshmaizeWasmService.name);
  private wasmDisabled = false;
  private romCache: Map<string, Rom> = new Map();

  // Alinhado com o teste Rust (wasm.rs)
  private readonly NB_LOOPS = 8;
  private readonly NB_INSTRS = 256;
  private readonly PRE_SIZE = 16 * 1024;          // 16 KB (como no teste Rust)
  private readonly MIXING_NUMBERS = 4;
  private readonly ROM_SIZE = 10 * 1024 * 1024;   // 10 MB (como no teste Rust)

  private getOrCreateRom(noPreMine: string): Rom {
    if (this.wasmDisabled) throw new Error('WASM disabled');

    if (this.romCache.has(noPreMine)) {
      return this.romCache.get(noPreMine)!;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(noPreMine)) {
      throw new Error(`Invalid no_pre_mine format: expected 64 hex chars`);
    }

    this.logger.log(`🔨 Building ROM for challenge ${noPreMine.slice(0, 16)}...`);
    this.logger.log(`Parameters: PRE_SIZE=${this.PRE_SIZE}, ROM_SIZE=${this.ROM_SIZE}, MIXING=${this.MIXING_NUMBERS}`);
    
    // Tentar ambos: UTF-8 e hex bytes
    const seedUtf8 = new TextEncoder().encode(noPreMine);
    const seedHex = new Uint8Array(32); // 32 bytes para o seed
    for (let i = 0; i < noPreMine.length; i += 2) {
      seedHex[i/2] = parseInt(noPreMine.slice(i, i+2), 16);
    }
    
    this.logger.log('🔍 Seed UTF-8:', [...seedUtf8].map(b => b.toString(16).padStart(2,'0')).join(''));
    this.logger.log('🔍 Seed Hex:', [...seedHex].map(b => b.toString(16).padStart(2,'0')).join(''));

    const builder = Rom.builder();
    builder.key(seedHex);  // Usar bytes do hex em vez de UTF-8
    builder.size(this.ROM_SIZE);
    builder.gen_two_steps(this.PRE_SIZE, this.MIXING_NUMBERS);

    const rom = builder.build();
    this.romCache.set(noPreMine, rom);
    return rom;
  }

  validateSolution(preimage: string | Uint8Array, noPreMine: string, difficulty: string): boolean {
    try {
      const rom = this.getOrCreateRom(noPreMine);
      
      // Log do preimage em diferentes formatos
      this.logger.log('🔍 Validating solution:');
      if (typeof preimage === 'string') {
        this.logger.log('Preimage (string):', preimage);
        this.logger.log('Preimage (UTF-8):', [...new TextEncoder().encode(preimage)].map(b => b.toString(16).padStart(2,'0')).join(''));
      } else {
        this.logger.log('Preimage (bytes):', [...preimage].map(b => b.toString(16).padStart(2,'0')).join(''));
      }
      
      // Tentar ambas conversões
      const bytesUtf8 = preimage instanceof Uint8Array ? preimage : new TextEncoder().encode(preimage);
      const bytesHex = typeof preimage === 'string' 
        ? new Uint8Array(preimage.length/2).map((_, i) => parseInt(preimage.slice(i*2, i*2+2), 16))
        : preimage;
      
      // Hash com UTF-8
      const hashBytesUtf8 = rom.hash(bytesUtf8, this.NB_LOOPS, this.NB_INSTRS);
      const hexStringUtf8 = [...hashBytesUtf8].map(b => b.toString(16).padStart(2,'0')).join('');
      this.logger.log('Hash (UTF-8):', hexStringUtf8);
      
      // Hash com hex bytes
      const hashBytesHex = rom.hash(bytesHex, this.NB_LOOPS, this.NB_INSTRS);
      const hexStringHex = [...hashBytesHex].map(b => b.toString(16).padStart(2,'0')).join('');
      this.logger.log('Hash (hex):', hexStringHex);
      
      // Verificar ambos
      const validUtf8 = this.checkDifficulty(hexStringUtf8, difficulty);
      const validHex = this.checkDifficulty(hexStringHex, difficulty);
      
      this.logger.log('Valid with UTF-8?', validUtf8);
      this.logger.log('Valid with hex?', validHex);
      
      return validUtf8 || validHex;
    } catch (e: any) {
      this.logger.error(`❌ Error validating solution: ${e.message}`);
      this.wasmDisabled = true;
      throw e;
    }
  }

  public checkDifficulty(hash: string, difficulty: string): boolean {
    if (hash.length < 8 || difficulty.length !== 8) return false;
    
    const hashPrefix = hash.slice(0, 8);
    const hashValue = parseInt(hashPrefix, 16) >>> 0;
    const target = parseInt(difficulty, 16) >>> 0;
    const zeroMask = (~target) >>> 0;
    
    this.logger.log(`Check difficulty: hash=${hashPrefix} (${hashValue}) against target=${difficulty} (${target})`);
    this.logger.log(`Mask=${zeroMask.toString(16)}, result=${(hashValue & zeroMask)}`);
    
    return (hashValue & zeroMask) === 0;
  }

  clearExpiredRoms(activeNoPreMine: string): void {
    for (const key of [...this.romCache.keys()]) {
      if (key !== activeNoPreMine) {
        this.romCache.delete(key);
      }
    }
  }
}