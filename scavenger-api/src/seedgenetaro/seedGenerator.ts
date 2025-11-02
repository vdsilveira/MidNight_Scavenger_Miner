import { createHash } from 'crypto';

// Helper para LE32
function u32ToLE(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

// Função para gerar SCAVENGER_GLOBAL_ROM_SEED
function getGlobalRomSeed(key: string, romSize: number) {
  const keyBuf = Buffer.from(key, 'utf-8');
  const data = Buffer.concat([u32ToLE(romSize), keyBuf]);
  const hash = createHash('blake2b512'); // Blake2b-512
  hash.update(data);
  return hash.digest().slice(0, 32).toString('hex'); // 32 bytes
}

const seed = getGlobalRomSeed('key', 1024 * 1024 * 1024); // 1 GB
console.log('SCAVENGER_GLOBAL_ROM_SEED=', seed);
