// Teste de casos específicos de dificuldade
console.log('🔍 Testando casos específicos de dificuldade...\n');

function testDifficulty(hashHex: string, difficultyHex: string) {
  const hashPrefix = hashHex.slice(0, 8);
  const hashValue = parseInt(hashPrefix, 16);
  const target = parseInt(difficultyHex, 16);
  const result = (hashValue | target) === target;
  
  console.log(`Hash: ${hashPrefix} (0x${hashPrefix.toUpperCase()}) = ${hashValue}`);
  console.log(`Target: ${difficultyHex.toUpperCase()} = ${target}`);
  console.log(`(hashValue | target) = ${(hashValue | target)} (0x${(hashValue | target).toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`Resultado: ${result ? '✅ ATENDE' : '❌ NÃO ATENDE'}\n`);
  return result;
}

console.log('📋 Casos de teste:\n');

// Caso 1: Hash exatamente igual ao target
console.log('Caso 1: Hash exatamente igual ao target');
testDifficulty('0000015F1234567890abcdef', '0000015F');

// Caso 2: Hash com todos os bits do target + extras
console.log('Caso 2: Hash com todos os bits do target + extras');
testDifficulty('000001FF1234567890abcdef', '0000015F');

// Caso 3: Hash faltando alguns bits do target
console.log('Caso 3: Hash faltando alguns bits do target');
testDifficulty('0000015E1234567890abcdef', '0000015F');

// Caso 4: Hash completamente diferente
console.log('Caso 4: Hash completamente diferente');
testDifficulty('FFFFFFFF1234567890abcdef', '0000015F');

// Caso 5: Hash com zeros à esquerda
console.log('Caso 5: Hash com zeros à esquerda');
testDifficulty('000000001234567890abcdef', '0000015F');

// Caso 6: Target com muitos bits (dificuldade alta)
console.log('Caso 6: Target com muitos bits (dificuldade alta)');
testDifficulty('FFFFFFFF1234567890abcdef', 'FFFFFFFF');

// Verificar a lógica: (hashValue | target) === target
console.log('🔢 Análise da lógica:');
console.log('   A condição (hashValue | target) === target significa:');
console.log('   "Todos os bits definidos no target devem estar definidos no hash"');
console.log('   Isso é equivalente a: (hashValue & target) === target');
console.log('   Mas o browser usa: (hashValue | target) === target\n');

// Testar equivalência
const testHash = 0x0000015E;
const testTarget = 0x0000015F;
console.log(`Teste de equivalência:`);
console.log(`   hashValue = 0x${testHash.toString(16).padStart(8, '0')}`);
console.log(`   target = 0x${testTarget.toString(16).padStart(8, '0')}`);
console.log(`   (hashValue | target) = 0x${(testHash | testTarget).toString(16).padStart(8, '0')}`);
console.log(`   (hashValue & target) = 0x${(testHash & testTarget).toString(16).padStart(8, '0')}`);
console.log(`   (hashValue | target) === target: ${(testHash | testTarget) === testTarget}`);
console.log(`   (hashValue & target) === target: ${(testHash & testTarget) === testTarget}`);

