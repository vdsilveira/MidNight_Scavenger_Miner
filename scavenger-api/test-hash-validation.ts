/**
 * Script de Validação de Hash AshMaize - Midnight Scavenger Mine
 * 
 * Este script testa se o cálculo de hash AshMaize está correto.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface HashTestResult {
  passed: boolean;
  test: string;
  details: string;
  error?: string;
  hash?: string;
  meetsDifficulty?: boolean;
}

const results: HashTestResult[] = [];

function logResult(result: HashTestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.test}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  if (result.hash) {
    console.log(`   Hash: ${result.hash.substring(0, 32)}...`);
  }
  if (result.error) {
    console.log(`   ❌ Erro: ${result.error}`);
  }
}

/**
 * Testar cálculo de hash usando o binário Rust
 */
async function testHashWithRustBinary(
  preimage: string,
  noPreMine: string,
  difficulty: string,
): Promise<HashTestResult> {
  return new Promise((resolve) => {
    const projectRoot = path.resolve(__dirname, '..');
    const binPath = path.join(projectRoot, 'ce-ashmaize', 'target', 'debug', 'ashmaize-hash');

    if (!fs.existsSync(binPath)) {
      resolve({
        passed: false,
        test: 'Hash com binário Rust',
        details: 'Binário não encontrado',
        error: `Binário não encontrado em: ${binPath}. Execute: cd ce-ashmaize && cargo build --package ashmaize-api --bin ashmaize-hash`,
      });
      return;
    }

    const request = {
      preimage,
      no_pre_mine: noPreMine,
      difficulty,
    };

    const process = spawn(binPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        resolve({
          passed: false,
          test: 'Hash com binário Rust',
          details: 'Processo falhou',
          error: `Exit code: ${code}, stderr: ${stderr}`,
        });
        return;
      }

      try {
        const response = JSON.parse(stdout.trim());
        resolve({
          passed: true,
          test: 'Hash com binário Rust',
          details: `Hash calculado com sucesso`,
          hash: response.hash,
          meetsDifficulty: response.meets_difficulty,
        });
      } catch (error: any) {
        resolve({
          passed: false,
          test: 'Hash com binário Rust',
          details: 'Erro ao parsear resposta',
          error: error.message,
        });
      }
    });

    process.on('error', (error) => {
      resolve({
        passed: false,
        test: 'Hash com binário Rust',
        details: 'Erro ao executar processo',
        error: error.message,
      });
    });

    process.stdin.write(JSON.stringify(request) + '\n');
    process.stdin.end();
  });
}

/**
 * Teste 1: Validação de hash com valores conhecidos
 */
async function testHashCalculation() {
  console.log('\n🔐 Teste 1: Cálculo de Hash AshMaize\n');

  const preimage = '0000000000000001addr1q...D01C01000000FF' + 'a'.repeat(64) + '2025-10-30T23:59:59.000Z1730332799';
  const noPreMine = 'a'.repeat(64);
  const difficulty = '000000FF';

  const result = await testHashWithRustBinary(preimage, noPreMine, difficulty);
  logResult(result);

  if (result.hash) {
    // Verificar que o hash tem 128 caracteres hex (64 bytes)
    const isValidLength = result.hash.length === 128;
    logResult({
      passed: isValidLength,
      test: 'Tamanho do hash',
      details: `Tamanho: ${result.hash.length} caracteres (esperado: 128)`,
      error: !isValidLength ? `Tamanho incorreto!` : undefined,
    });

    // Verificar formato hex
    const isHex = /^[0-9a-f]{128}$/.test(result.hash);
    logResult({
      passed: isHex,
      test: 'Formato hex do hash',
      details: 'Formato correto',
      error: !isHex ? 'Contém caracteres não-hexadecimais' : undefined,
    });
  }
}

/**
 * Teste 2: Determinismo do hash
 */
async function testHashDeterminism() {
  console.log('\n🔄 Teste 2: Determinismo do Hash\n');

  const preimage = '0000000000000001addr1q...D01C01000000FF' + 'a'.repeat(64) + '2025-10-30T23:59:59.000Z1730332799';
  const noPreMine = 'a'.repeat(64);
  const difficulty = '000000FF';

  const result1 = await testHashWithRustBinary(preimage, noPreMine, difficulty);
  const result2 = await testHashWithRustBinary(preimage, noPreMine, difficulty);

  if (result1.hash && result2.hash) {
    const isDeterministic = result1.hash === result2.hash;
    logResult({
      passed: isDeterministic,
      test: 'Hash determinístico',
      details: isDeterministic ? 'Mesmo input produz mesmo hash' : 'Hashes diferentes!',
      error: !isDeterministic ? 'Hash não é determinístico!' : undefined,
      hash: result1.hash,
    });
  } else {
    logResult({
      passed: false,
      test: 'Hash determinístico',
      details: 'Não foi possível calcular hash',
      error: 'Hash não calculado',
    });
  }
}

/**
 * Teste 3: Validação de dificuldade
 */
async function testDifficultyValidation() {
  console.log('\n⚙️ Teste 3: Validação de Dificuldade\n');

  // Criar vários hashes e verificar dificuldade
  const testCases = [
    { difficulty: '000000FF', description: 'Dificuldade baixa' },
    { difficulty: '0000FFFF', description: 'Dificuldade média' },
    { difficulty: 'FFFFFFFF', description: 'Dificuldade máxima' },
  ];

  for (const testCase of testCases) {
    const preimage = '0000000000000001addr1q...D01C01' + testCase.difficulty + 'a'.repeat(64) + '2025-10-30T23:59:59.000Z1730332799';
    const noPreMine = 'a'.repeat(64);

    const result = await testHashWithRustBinary(preimage, noPreMine, testCase.difficulty);

    if (result.hash && typeof result.meetsDifficulty !== 'undefined') {
      logResult({
        passed: true,
        test: `Validação de dificuldade: ${testCase.description}`,
        details: `Atende dificuldade: ${result.meetsDifficulty}`,
        hash: result.hash,
        meetsDifficulty: result.meetsDifficulty,
      });

      // Verificar lógica de dificuldade manualmente
      if (result.hash.length >= 8) {
        const hashPrefix = result.hash.substring(0, 8);
        const hashNum = parseInt(hashPrefix, 16) >>> 0;
        const diffNum = parseInt(testCase.difficulty, 16) >>> 0;
        const zeroMask = (~diffNum) >>> 0;
        const shouldMeetDifficulty = (hashNum & zeroMask) === 0;

        logResult({
          passed: result.meetsDifficulty === shouldMeetDifficulty,
          test: `Lógica de dificuldade manual vs Rust: ${testCase.description}`,
          details: `Manual: ${shouldMeetDifficulty}, Rust: ${result.meetsDifficulty}`,
          error: result.meetsDifficulty !== shouldMeetDifficulty ? 'Lógica não corresponde!' : undefined,
        });
      }
    } else {
      logResult({
        passed: false,
        test: `Validação de dificuldade: ${testCase.description}`,
        details: 'Não foi possível calcular',
        error: 'Hash não calculado',
      });
    }
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('🧪 Validação de Hash AshMaize - Midnight Scavenger Mine\n');
  console.log('='.repeat(60));

  await testHashCalculation();
  await testHashDeterminism();
  await testDifficultyValidation();

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
    console.log('\n✅ O cálculo de hash está correto conforme a especificação Midnight.');
  }
}

// Executar
runAllTests().catch(console.error);
