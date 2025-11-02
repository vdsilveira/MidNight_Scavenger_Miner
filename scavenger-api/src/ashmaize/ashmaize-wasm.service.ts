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
    // ✅ ROM compartilhada: verificar se já existe no cache
    if (this.romCache.has(noPreMine)) {
      this.logger.debug(`♻️  Reusing cached ROM for ${noPreMine.substring(0, 16)}...`);
      return this.romCache.get(noPreMine)!;
    }

    this.logger.log(`🔨 Building ROM for challenge ${noPreMine.substring(0, 16)}... (this may take a moment)`);
    
    // ✅ Converter no_pre_mine de hex string para bytes
    // no_pre_mine deve ser uma string hex de 64 caracteres (32 bytes após conversão)
    let romSeed: Buffer;
    try {
      if (!/^[0-9a-fA-F]{64}$/.test(noPreMine)) {
        throw new Error(`Invalid no_pre_mine format: expected 64 hex chars, got ${noPreMine.length}`);
      }
      romSeed = Buffer.from(noPreMine, 'hex');
      if (romSeed.length !== 32) {
        throw new Error(`Invalid romSeed length: expected 32 bytes, got ${romSeed.length}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to convert no_pre_mine to bytes: ${error.message}`);
      throw new Error(`Invalid no_pre_mine: ${error.message}`);
    }

    try {
      // ✅ Ordem correta: key primeiro, depois size, depois gen_type
      const builder = Rom.builder();
      builder.key(romSeed); // Seed da ROM (32 bytes)
      builder.size(this.ROM_SIZE); // 1GB
      builder.gen_two_steps(this.PRE_SIZE, this.MIXING_NUMBERS); // Two-step generation
      
      // ✅ build() lança exceção em caso de erro (WASM não retorna Result)
      const rom = builder.build();
      
      this.logger.log(`✅ ROM created and cached for challenge ${noPreMine.substring(0, 16)}...`);
      this.romCache.set(noPreMine, rom);
      return rom;
    } catch (error: any) {
      this.wasmDisabled = true;
      this.logger.error(`❌ WASM ROM generation failed: ${error.message}`);
      this.logger.error(`   Error details: ${error.stack || error}`);
      throw new Error(`WASM ROM generation failed: ${error.message}`);
    }
  }




  validateSolution(preimage: string, noPreMine: string, difficulty: string): boolean {
    if (this.wasmDisabled) {
      throw new Error('WASM disabled');
    }

    try {
      // ✅ Obter ROM (compartilhada entre workers)
      const rom = this.getOrCreateRom(noPreMine);
      
      // ✅ Converter preimage string para bytes UTF-8
      const bytes = new TextEncoder().encode(preimage);
      
      // ✅ Calcular hash AshMaize
      const hash = rom.hash(bytes, this.NB_LOOPS, this.NB_INSTRS);
      
      // ✅ Converter hash bytes para hex string
      const hex = Buffer.from(hash).toString('hex');
      
      // ✅ Verificar se atende à dificuldade
      const meetsDifficulty = this.checkDifficulty(hex, difficulty);
      
      return meetsDifficulty;
    } catch (e: any) {
      this.logger.error(`❌ Error validating solution: ${e.message}`);
      this.logger.error(`   Stack: ${e.stack || 'N/A'}`);
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
    // ✅ Validar formato
    if (hash.length < 8) {
      this.logger.warn(`Hash too short: ${hash.length} chars (need at least 8)`);
      return false;
    }
    
    if (difficulty.length !== 8) {
      this.logger.warn(`Invalid difficulty format: ${difficulty} (need 8 hex chars)`);
      return false;
    }
    
    // ✅ Extrair primeiros 4 bytes (8 hex chars) do hash
    const hashPrefix = hash.substring(0, 8);
    
    // ✅ Converter para números (usando >>> 0 para garantir unsigned 32-bit)
    const hashNum = parseInt(hashPrefix, 16) >>> 0;
    const diffNum = parseInt(difficulty, 16) >>> 0;
    
    // ✅ Calcular máscara de bits zero
    // A dificuldade especifica quais bits devem ser zero
    // zeroMask = ~difficulty indica quais bits devem ser zero
    const zeroMask = (~diffNum) >>> 0;
    
    // ✅ Verificar se os bits que devem ser zero são realmente zero
    const meetsDifficulty = (hashNum & zeroMask) === 0;
    
    return meetsDifficulty;
  }

  /** 
   * Limpa ROMs expiradas - mantém apenas a ROM do desafio ativo
   * @param activeNoPreMine no_pre_mine do desafio ativo (será mantido)
   */
  clearExpiredRoms(activeNoPreMine: string): void {
    const beforeSize = this.romCache.size;
    
    // ✅ Remover todas as ROMs que NÃO são do desafio ativo
    const toRemove: string[] = [];
    for (const [key, _] of this.romCache.entries()) {
      if (key !== activeNoPreMine) {
        toRemove.push(key);
      }
    }
    
    // Remover ROMs expiradas
    for (const key of toRemove) {
      this.romCache.delete(key);
    }
    
    const afterSize = this.romCache.size;
    const removed = beforeSize - afterSize;
    
    if (removed > 0) {
      this.logger.log(
        `🗑️  Cleaned ${removed} expired ROM(s), keeping ROM for ${activeNoPreMine.substring(0, 16)}... ` +
        `(${afterSize} ROM(s) in cache)`
      );
    }
  }
}
