/**
 * Script de Validação de Submissão - Midnight Scavenger Mine
 * 
 * Este script testa o fluxo completo de submissão de uma solução minerada.
 */

import { Test } from '@nestjs/testing';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { SolutionService } from './src/solution/solution.service';
import { ChallengeService } from './src/challenge/challenge.service';

interface SubmissionTestResult {
  passed: boolean;
  test: string;
  details: string;
  error?: string;
}

const results: SubmissionTestResult[] = [];

function logResult(result: SubmissionTestResult) {
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
 * Teste 1: Validação do formato da submissão
 */
async function testSubmissionFormat(solutionService: SolutionService) {
  console.log('\n🔍 Teste 1: Formato da Submissão\n');

  // Caso de teste com todos os campos corretos
  const validSubmission = {
    nonce: '0000000000000001',
    address: 'addr1q...',
    challengeId: '01',
    difficulty: '000000FF',
    noPreMine: 'a'.repeat(64),
    latestSubmission: '2025-10-30T23:59:59.000Z',
    noPreMineHour: '1730332799'
  };

  try {
    const result = await solutionService.validateSubmission(validSubmission);
    logResult({
      passed: result,
      test: 'Submissão válida',
      details: 'Todos os campos no formato correto'
    });
  } catch (error: any) {
    logResult({
      passed: false,
      test: 'Submissão válida',
      details: 'Falha ao validar submissão',
      error: error.message
    });
  }

  // Testar campos obrigatórios faltando
  const requiredFields = ['nonce', 'address', 'challengeId', 'difficulty', 'noPreMine', 'latestSubmission', 'noPreMineHour'];
  for (const field of requiredFields) {
    const invalidSubmission = { ...validSubmission };
    delete (invalidSubmission as any)[field];

    try {
      await solutionService.validateSubmission(invalidSubmission);
      logResult({
        passed: false,
        test: `Campo obrigatório: ${field}`,
        details: `Deveria falhar quando ${field} está faltando`,
        error: 'Validação não falhou como esperado'
      });
    } catch (error: any) {
      logResult({
        passed: true,
        test: `Campo obrigatório: ${field}`,
        details: `Validação falhou corretamente quando ${field} está faltando`
      });
    }
  }
}

/**
 * Teste 2: Validação do preimage
 */
async function testPreimageGeneration(solutionService: SolutionService) {
  console.log('\n🔗 Teste 2: Geração do Preimage\n');

  const submission = {
    nonce: '0000000000000001',
    address: 'addr1q...',
    challengeId: '01',
    difficulty: '000000FF',
    noPreMine: 'a'.repeat(64),
    latestSubmission: '2025-10-30T23:59:59.000Z',
    noPreMineHour: '1730332799'
  };

  try {
    // Gerar preimage
    const preimage = await solutionService.generatePreimage(submission);
    
    // Verificar ordem dos campos
    const expectedOrder = [
      submission.nonce,
      submission.address,
      submission.challengeId,
      submission.difficulty,
      submission.noPreMine,
      submission.latestSubmission,
      submission.noPreMineHour
    ].join('');

    logResult({
      passed: preimage === expectedOrder,
      test: 'Ordem dos campos no preimage',
      details: 'Campos concatenados na ordem correta',
      error: preimage !== expectedOrder ? 'Ordem dos campos incorreta' : undefined
    });
  } catch (error: any) {
    logResult({
      passed: false,
      test: 'Geração do preimage',
      details: 'Falha ao gerar preimage',
      error: error.message
    });
  }
}

/**
 * Teste 3: Validação da dificuldade do challenge atual
 */
async function testCurrentChallengeDifficulty(challengeService: ChallengeService) {
  console.log('\n⚡ Teste 3: Dificuldade do Challenge\n');

  try {
    const challenge = await challengeService.getCurrentChallenge();
    
    // Verificar formato da dificuldade
    const isDifficultyValid = /^[0-9A-F]{8}$/i.test(challenge.difficulty);
    logResult({
      passed: isDifficultyValid,
      test: 'Formato da dificuldade',
      details: `Dificuldade: ${challenge.difficulty}`,
      error: !isDifficultyValid ? 'Formato de dificuldade inválido' : undefined
    });

    // Verificar se dificuldade está dentro dos limites
    const difficultyValue = parseInt(challenge.difficulty, 16);
    const isWithinLimits = difficultyValue >= parseInt('000000FF', 16) && 
                          difficultyValue <= parseInt('FFFFFFFF', 16);
    
    logResult({
      passed: isWithinLimits,
      test: 'Limites de dificuldade',
      details: `Valor: ${difficultyValue}`,
      error: !isWithinLimits ? 'Dificuldade fora dos limites permitidos' : undefined
    });

  } catch (error: any) {
    logResult({
      passed: false,
      test: 'Obter challenge atual',
      details: 'Falha ao obter challenge',
      error: error.message
    });
  }
}

/**
 * Teste 4: Validação do timestamp e hora no_pre_mine
 */
async function testTimestampValidation(solutionService: SolutionService) {
  console.log('\n🕒 Teste 4: Validação de Timestamp\n');

  const now = new Date();
  const submission = {
    nonce: '0000000000000001',
    address: 'addr1q...',
    challengeId: '01',
    difficulty: '000000FF',
    noPreMine: 'a'.repeat(64),
    latestSubmission: now.toISOString(),
    noPreMineHour: Math.floor(now.getTime() / 1000).toString()
  };

  try {
    const isValid = await solutionService.validateTimestamps(submission);
    logResult({
      passed: isValid,
      test: 'Timestamps válidos',
      details: 'Timestamps atuais são válidos',
      error: !isValid ? 'Validação de timestamp falhou' : undefined
    });

    // Testar com timestamp futuro
    const futureSubmission = {
      ...submission,
      latestSubmission: new Date(now.getTime() + 3600000).toISOString()
    };
    
    try {
      await solutionService.validateTimestamps(futureSubmission);
      logResult({
        passed: false,
        test: 'Timestamp futuro',
        details: 'Deveria rejeitar timestamp futuro',
        error: 'Aceitou timestamp futuro incorretamente'
      });
    } catch (error: any) {
      logResult({
        passed: true,
        test: 'Timestamp futuro',
        details: 'Rejeitou timestamp futuro corretamente'
      });
    }

  } catch (error: any) {
    logResult({
      passed: false,
      test: 'Validação de timestamps',
      details: 'Falha ao validar timestamps',
      error: error.message
    });
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('🧪 Validação de Submissão - Midnight Scavenger Mine\n');
  console.log('='.repeat(60));

  const moduleRef = await Test.createTestingModule({
    providers: [
      SolutionService,
      ChallengeService,
      AshmaizeWasmService
    ],
  }).compile();

  const solutionService = moduleRef.get<SolutionService>(SolutionService);
  const challengeService = moduleRef.get<ChallengeService>(ChallengeService);

  await testSubmissionFormat(solutionService);
  await testPreimageGeneration(solutionService);
  await testCurrentChallengeDifficulty(challengeService);
  await testTimestampValidation(solutionService);

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
    console.log('\n✅ O fluxo de submissão está correto conforme a especificação Midnight.');
  }
}

// Executar
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };