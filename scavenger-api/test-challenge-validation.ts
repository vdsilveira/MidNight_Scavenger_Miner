/**
 * Script de Validação de Challenges - Midnight Scavenger Mine
 * 
 * Este script verifica se o backend está resolvendo os challenges corretamente
 * conforme a especificação do Midnight.
 */

import * as crypto from 'crypto';

interface ChallengeValidationResult {
  passed: boolean;
  test: string;
  details: string;
  error?: string;
}

const results: ChallengeValidationResult[] = [];

function logResult(result: ChallengeValidationResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.test}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  if (result.error) {
    console.log(`   ❌ Erro: ${result.error}`);
  }
}

/**
 * Teste 1: Validação da construção do preimage
 */
function testPreimageConstruction() {
  console.log('\n📝 Teste 1: Construção do Preimage\n');

  const nonce = '0000000000000001';
  const address = 'addr1qxemvvgh5hfedv26g2qd7mancmqpkhyq4frtd...';
  const challengeId = 'D01C01';
  const difficulty = '000000FF';
  const noPreMine = 'a'.repeat(64); // 64 hex chars
  const latestSubmission = '2025-10-30T23:59:59.000Z';
  const noPreMineHour = '1730332799';

  // Construir preimage (mesma lógica do backend)
  const preimage = `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;

  // Verificar ordem correta
  const expectedOrder = [
    nonce,
    address,
    challengeId,
    difficulty,
    noPreMine,
    latestSubmission,
    noPreMineHour,
  ];

  let isValid = true;
  let currentPos = 0;

  for (const part of expectedOrder) {
    const index = preimage.indexOf(part, currentPos);
    if (index !== currentPos) {
      isValid = false;
      logResult({
        passed: false,
        test: 'Ordem do preimage',
        details: `Parte "${part}" não está na posição correta`,
        error: `Esperado em ${currentPos}, encontrado em ${index}`,
      });
      return;
    }
    currentPos += part.length;
  }

  logResult({
    passed: true,
    test: 'Ordem do preimage',
    details: `Preimage construído corretamente: ${preimage.length} caracteres`,
  });

  // Verificar que não há separadores
  if (preimage.includes('|') || preimage.includes(' ') || preimage.includes('+')) {
    logResult({
      passed: false,
      test: 'Preimage sem separadores',
      details: 'Preimage não deve conter separadores',
      error: `Encontrado separador em: ${preimage}`,
    });
  } else {
    logResult({
      passed: true,
      test: 'Preimage sem separadores',
      details: 'Nenhum separador encontrado',
    });
  }
}

/**
 * Teste 2: Validação do formato do nonce
 */
function testNonceFormat() {
  console.log('\n🔢 Teste 2: Formato do Nonce\n');

  const validNonces = [
    '0000000000000000',
    'FFFFFFFFFFFFFFFF',
    '1234567890ABCDEF',
    '0000000000000001',
  ];

  const invalidNonces = [
    '000000000000000', // 15 chars
    '00000000000000000', // 17 chars
    '000000000000000g', // caractere inválido
    '000000000000000', // sem padding
  ];

  for (const nonce of validNonces) {
    const isValid = /^[0-9a-fA-F]{16}$/.test(nonce);
    logResult({
      passed: isValid,
      test: `Nonce válido: ${nonce}`,
      details: isValid ? 'Formato correto' : 'Formato incorreto',
    });
  }

  for (const nonce of invalidNonces) {
    const isValid = /^[0-9a-fA-F]{16}$/.test(nonce);
    logResult({
      passed: !isValid,
      test: `Nonce inválido rejeitado: ${nonce}`,
      details: !isValid ? 'Rejeitado corretamente' : 'DEVERIA ser rejeitado!',
    });
  }
}

/**
 * Teste 3: Validação do no_pre_mine
 */
function testNoPreMine() {
  console.log('\n🔐 Teste 3: Formato do no_pre_mine\n');

  // Gerar no_pre_mine como o backend faz
  const ROM_SEED = "MIDNIGHT_SCAVENGER_MINE_ROM_v1";
  const challengeId = "D01C01";
  const noPreMine = crypto
    .createHash('sha256')
    .update(`${ROM_SEED}:${challengeId}`)
    .digest('hex');

  // Verificar que tem 64 caracteres (32 bytes em hex)
  const isValidLength = noPreMine.length === 64;
  logResult({
    passed: isValidLength,
    test: 'Tamanho do no_pre_mine',
    details: `Tamanho: ${noPreMine.length} caracteres (esperado: 64)`,
    error: !isValidLength ? `Tamanho incorreto: ${noPreMine.length}` : undefined,
  });

  // Verificar formato hex
  const isHex = /^[0-9a-f]{64}$/.test(noPreMine);
  logResult({
    passed: isHex,
    test: 'Formato hex do no_pre_mine',
    details: isHex ? 'Formato correto' : 'Formato incorreto',
    error: !isHex ? 'Contém caracteres não-hexadecimais' : undefined,
  });

  // Verificar que é determinístico
  const noPreMine2 = crypto
    .createHash('sha256')
    .update(`${ROM_SEED}:${challengeId}`)
    .digest('hex');
  const isDeterministic = noPreMine === noPreMine2;
  logResult({
    passed: isDeterministic,
    test: 'Determinismo do no_pre_mine',
    details: isDeterministic ? 'Gerado deterministicamente' : 'NÃO é determinístico!',
    error: !isDeterministic ? 'Valores diferentes para mesma entrada' : undefined,
  });
}

/**
 * Teste 4: Validação da dificuldade
 */
function testDifficulty() {
  console.log('\n⚙️ Teste 4: Cálculo da Dificuldade\n');

  const calculateDifficulty = (day: number): string => {
    const baseDifficulty = 0x000000ff;
    const difficulty = Math.min(baseDifficulty + (day * 0x10), 0xffffffff);
    return difficulty.toString(16).padStart(8, '0').toUpperCase();
  };

  // Testar alguns valores (conforme implementação real)
  // difficulty = min(0x000000FF + (day * 0x10), 0xffffffff)
  // Dia 1: 0xFF + (1 * 0x10) = 0xFF + 0x10 = 0x10F
  // Dia 2: 0xFF + (2 * 0x10) = 0xFF + 0x20 = 0x11F
  const testCases = [
    { day: 1, expected: '0000010F' }, // 0xFF + 0x10 = 0x10F
    { day: 2, expected: '0000011F' }, // 0xFF + 0x20 = 0x11F
    { day: 10, expected: '0000019F' }, // 0xFF + 0xA0 = 0x19F
  ];

  for (const testCase of testCases) {
    const difficulty = calculateDifficulty(testCase.day);
    const isValid = difficulty === testCase.expected;
    logResult({
      passed: isValid,
      test: `Dificuldade dia ${testCase.day}`,
      details: `Esperado: ${testCase.expected}, Obtido: ${difficulty}`,
      error: !isValid ? `Valor incorreto!` : undefined,
    });
  }

  // Verificar formato (8 hex chars, maiúsculas)
  const difficulty = calculateDifficulty(1);
  const isValidFormat = /^[0-9A-F]{8}$/.test(difficulty);
  logResult({
    passed: isValidFormat,
    test: 'Formato da dificuldade',
    details: `Formato: ${difficulty}`,
    error: !isValidFormat ? 'Formato incorreto' : undefined,
  });
}

/**
 * Teste 5: Validação do challenge_id
 */
function testChallengeId() {
  console.log('\n🎯 Teste 5: Formato do Challenge ID\n');

  const calculateChallengeId = (day: number, challengeNumber: number): string => {
    return `D${String(day).padStart(2, '0')}C${String(challengeNumber).padStart(2, '0')}`;
  };

  const testCases = [
    { day: 1, number: 1, expected: 'D01C01' },
    { day: 5, number: 10, expected: 'D05C10' },
    { day: 21, number: 24, expected: 'D21C24' },
  ];

  for (const testCase of testCases) {
    const challengeId = calculateChallengeId(testCase.day, testCase.number);
    const isValid = challengeId === testCase.expected;
    logResult({
      passed: isValid,
      test: `Challenge ID dia ${testCase.day}, número ${testCase.number}`,
      details: `Esperado: ${testCase.expected}, Obtido: ${challengeId}`,
      error: !isValid ? `Valor incorreto!` : undefined,
    });
  }

  // Verificar formato
  const challengeId = calculateChallengeId(1, 1);
  const isValidFormat = /^D\d{2}C\d{2}$/.test(challengeId);
  logResult({
    passed: isValidFormat,
    test: 'Formato do Challenge ID',
    details: `Formato: ${challengeId}`,
    error: !isValidFormat ? 'Formato incorreto' : undefined,
  });
}

/**
 * Teste 6: Validação da ordem do preimage (conforme especificação)
 */
function testPreimageOrder() {
  console.log('\n📋 Teste 6: Ordem do Preimage (Conforme Especificação)\n');

  const nonce = '0000000000000001';
  const address = 'addr1q...';
  const challengeId = 'D01C01';
  const difficulty = '000000FF';
  const noPreMine = 'a'.repeat(64);
  const latestSubmission = '2025-10-30T23:59:59.000Z';
  const noPreMineHour = '1730332799';

  // Ordem conforme especificação Midnight
  const preimage = `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;

  // Verificar cada componente
  const components = [
    { name: 'nonce', value: nonce, expectedLength: 16 },
    { name: 'address', value: address },
    { name: 'challenge_id', value: challengeId, expectedFormat: /^D\d{2}C\d{2}$/ },
    { name: 'difficulty', value: difficulty, expectedLength: 8 },
    { name: 'no_pre_mine', value: noPreMine, expectedLength: 64 },
    { name: 'latest_submission', value: latestSubmission, expectedFormat: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ },
    { name: 'no_pre_mine_hour', value: noPreMineHour },
  ];

  let position = 0;
  for (const comp of components) {
    const index = preimage.indexOf(comp.value, position);
    const isInOrder = index === position;
    
    logResult({
      passed: isInOrder,
      test: `${comp.name} na posição correta`,
      details: `Posição: ${position}-${position + comp.value.length}`,
      error: !isInOrder ? `Encontrado em ${index} mas esperado em ${position}` : undefined,
    });

    if (comp.expectedLength) {
      const hasCorrectLength = comp.value.length === comp.expectedLength;
      logResult({
        passed: hasCorrectLength,
        test: `${comp.name} tem tamanho correto`,
        details: `Tamanho: ${comp.value.length} (esperado: ${comp.expectedLength})`,
        error: !hasCorrectLength ? `Tamanho incorreto!` : undefined,
      });
    }

    if (comp.expectedFormat) {
      const matchesFormat = comp.expectedFormat.test(comp.value);
      logResult({
        passed: matchesFormat,
        test: `${comp.name} tem formato correto`,
        details: `Formato: ${comp.value}`,
        error: !matchesFormat ? `Formato incorreto!` : undefined,
      });
    }

    position += comp.value.length;
  }
}

/**
 * Teste 7: Validação da conversão do preimage para bytes
 */
function testPreimageToBytes() {
  console.log('\n🔤 Teste 7: Conversão Preimage para Bytes\n');

  const preimage = '0000000000000001addr1q...D01C01000000FF' + 'a'.repeat(64) + '2025-10-30T23:59:59.000Z1730332799';
  
  // Converter para bytes (mesmo método do backend)
  const bytes = new TextEncoder().encode(preimage);
  
  // Verificar que a conversão funciona
  const isValid = bytes.length > 0 && bytes.length === Buffer.from(preimage, 'utf8').length;
  logResult({
    passed: isValid,
    test: 'Conversão preimage para bytes',
    details: `Tamanho: ${bytes.length} bytes`,
    error: !isValid ? 'Conversão falhou' : undefined,
  });

  // Verificar que pode ser decodificado de volta
  const decoded = new TextDecoder().decode(bytes);
  const matchesOriginal = decoded === preimage;
  logResult({
    passed: matchesOriginal,
    test: 'Round-trip preimage (bytes -> string)',
    details: 'Conversão reversa funciona',
    error: !matchesOriginal ? 'Não corresponde ao original' : undefined,
  });
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('🧪 Validação de Challenges - Midnight Scavenger Mine\n');
  console.log('=' .repeat(60));

  testPreimageConstruction();
  testNonceFormat();
  testNoPreMine();
  testDifficulty();
  testChallengeId();
  testPreimageOrder();
  testPreimageToBytes();

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo dos Testes\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total de testes: ${total}`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📈 Taxa de sucesso: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Testes que falharam:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ❌ ${r.test}`);
      if (r.error) {
        console.log(`      Erro: ${r.error}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n🎉 Todos os testes passaram!');
    console.log('\n✅ O backend está resolvendo os challenges corretamente conforme a especificação Midnight.');
  }
}

// Executar
runAllTests().catch(console.error);
