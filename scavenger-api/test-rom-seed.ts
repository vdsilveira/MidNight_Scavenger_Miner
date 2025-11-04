// Teste para verificar como a ROM seed está sendo criada
console.log('🔍 Testando criação da ROM seed...\n');

const noPreMine = '7957335b96957c2051b607e79f71e58554e88d356ed40e417c1c1d1a7d41057d';

console.log('no_pre_mine (hex string):');
console.log(`  ${noPreMine}`);
console.log(`  Length: ${noPreMine.length} chars\n`);

// Método ANTIGO (ERRADO)
const oldMethod = Buffer.from(noPreMine, 'hex');
console.log('Método ANTIGO (Buffer.from(noPreMine, "hex")):');
console.log(`  Length: ${oldMethod.length} bytes`);
console.log(`  First 20 bytes: ${Array.from(oldMethod.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log(`  Hex: ${oldMethod.toString('hex')}\n`);

// Método NOVO (CORRETO - como no browser)
const newMethod = new TextEncoder().encode(noPreMine);
console.log('Método NOVO (TextEncoder().encode(noPreMine)):');
console.log(`  Length: ${newMethod.length} bytes`);
console.log(`  First 20 bytes: ${Array.from(newMethod.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log(`  Hex: ${Array.from(newMethod).map(b => b.toString(16).padStart(2, '0')).join('')}\n`);

console.log('✅ Diferença:');
console.log(`  Método antigo trata como hex bytes (64 chars → 32 bytes)`);
console.log(`  Método novo trata como string UTF-8 (64 chars → 64 bytes)`);
console.log(`  O browser usa o método novo!\n`);

// Verificar se são diferentes
const areDifferent = !oldMethod.equals(newMethod);
console.log(`São diferentes: ${areDifferent ? '✅ SIM (CORRETO)' : '❌ NÃO (PROBLEMA!)'}`);

