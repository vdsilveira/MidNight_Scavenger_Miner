// Teste para entender a lógica de dificuldade
console.log('🔍 Testando lógica de dificuldade...\n');

// Exemplo do teste
const hashPrefix = '63f19e36';
const difficulty = '0000015F';

const hashValue = parseInt(hashPrefix, 16);
const target = parseInt(difficulty, 16);

console.log(`Hash prefix: ${hashPrefix}`);
console.log(`Difficulty: ${difficulty}`);
console.log(`Hash value (decimal): ${hashValue}`);
console.log(`Target (decimal): ${target}`);
console.log(`Hash value (hex): 0x${hashValue.toString(16).padStart(8, '0')}`);
console.log(`Target (hex): 0x${target.toString(16).padStart(8, '0')}`);
console.log(`\nHash value (binary): ${hashValue.toString(2).padStart(32, '0')}`);
console.log(`Target (binary): ${target.toString(2).padStart(32, '0')}`);

const result = hashValue | target;
console.log(`\n(hashValue | target) = ${result}`);
console.log(`(hashValue | target) (hex) = 0x${result.toString(16).padStart(8, '0')}`);
console.log(`(hashValue | target) (binary) = ${result.toString(2).padStart(32, '0')}`);
console.log(`\nAtende dificuldade: ${(result === target) ? '✅ SIM' : '❌ NÃO'}`);

// Testar alguns casos específicos
console.log('\n📊 Testando casos específicos:');
const testCases = [
  { hash: '0000015F', difficulty: '0000015F', expected: true },
  { hash: '0000015E', difficulty: '0000015F', expected: false },
  { hash: '000001FF', difficulty: '0000015F', expected: true },
  { hash: '00000000', difficulty: '0000015F', expected: false },
];

testCases.forEach(test => {
  const h = parseInt(test.hash, 16);
  const t = parseInt(test.difficulty, 16);
  const meets = (h | t) === t;
  const status = meets === test.expected ? '✅' : '❌';
  console.log(`  ${status} Hash: ${test.hash}, Difficulty: ${test.difficulty}, Result: ${meets} (expected: ${test.expected})`);
});

// Verificar quantos bits precisam ser zero
console.log('\n🔢 Análise de bits:');
const targetBits = target.toString(2).padStart(32, '0');
const leadingZeros = 32 - targetBits.length + (targetBits.match(/^0*/)?.[0]?.length || 0);
console.log(`  Target tem ${leadingZeros} zeros à esquerda`);
console.log(`  Bits definidos no target: ${targetBits.split('1').length - 1}`);

// Calcular probabilidade
const probability = Math.pow(2, -targetBits.split('1').length + 1);
console.log(`  Probabilidade aproximada: 1 em ${Math.round(1/probability)}`);

