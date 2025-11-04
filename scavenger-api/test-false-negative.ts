import { Test } from '@nestjs/testing';
import { AshmaizeService } from './src/ashmaize/ashmaize.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { SolutionService } from './src/solution/solution.service';

interface TestCase {
  nonce: string;
  address: string;
  challengeId: string;
  difficulty: string;
  noPreMine: string;
  latestSubmission: string;
  noPreMineHour: string;
  expectedValid: boolean;
}

async function runTest(testCase: TestCase, services: {
  ashmaizeService: AshmaizeService,
  solutionService: SolutionService
}) {
  console.log(`\n🧪 Testando caso: ${JSON.stringify(testCase, null, 2)}`);

  // 1. Primeiro vamos gerar o preimage exatamente como o browser faria
  const preimage = [
    testCase.nonce,
    testCase.address,
    testCase.challengeId,
    testCase.difficulty,
    testCase.noPreMine,
    testCase.latestSubmission,
    testCase.noPreMineHour
  ].join('');

  // 2. Calcular o hash usando WASM (como browser faz)
  const browserHash = await services.ashmaizeService.computeHash(preimage, testCase.noPreMine);
  console.log(`\nHash gerado (browser-style): ${browserHash}`);

  // 3. Validar usando o serviço (como API faz)
  const isValidWasm = await services.ashmaizeService.validateSolution(
    preimage,
    testCase.noPreMine,
    testCase.difficulty
  );

  // 4. Verificar manualmente a dificuldade (double-check)
  const hashPrefix = browserHash.substring(0, 8);
  const hashNum = parseInt(hashPrefix, 16);
  const targetNum = parseInt(testCase.difficulty, 16);
  const manualCheck = (hashNum | targetNum) === targetNum;

  console.log(`\nValidação WASM: ${isValidWasm}`);
  console.log(`Validação Manual: ${manualCheck}`);
  console.log(`Hash Prefix: ${hashPrefix} (${hashNum})`);
  console.log(`Target: ${testCase.difficulty} (${targetNum})`);

  if (isValidWasm !== manualCheck) {
    console.error('❌ ERRO: Divergência entre validação WASM e manual!');
    process.exit(1);
  }

  if (isValidWasm !== testCase.expectedValid) {
    console.error('❌ ERRO: Resultado diferente do esperado!');
    process.exit(1);
  }

  console.log('✅ Teste passou!');
}

async function main() {
  // Setup
  const moduleRef = await Test.createTestingModule({
    providers: [
      AshmaizeService,
      AshmaizeWasmService,
      {
        provide: 'AshmaizeNativeService',
        useValue: undefined  // Native service é opcional
      },
      SolutionService,
      {
        provide: 'StorageService',
        useValue: {
          isRegistered: () => true,
          addSolution: () => {}
        }
      },
      {
        provide: 'ChallengeService',
        useValue: {
          getCurrentChallenge: () => ({
            code: 'active',
            challenge: {
              challenge_id: '**D01C01',
              difficulty: '000000FF',
              no_pre_mine: 'a'.repeat(64),
              latest_submission: '2025-10-30T23:59:59.000Z',
              no_pre_mine_hour: '1730332799'
            }
          })
        }
      }
    ],
  }).compile();

  const services = {
    ashmaizeService: moduleRef.get<AshmaizeService>(AshmaizeService),
    solutionService: moduleRef.get<SolutionService>(SolutionService)
  };

  // Casos de teste que DEVEM ser válidos
  const testCases: TestCase[] = [
    // Caso 1: Dificuldade baixa (mais fácil de gerar hash válido)
    {
      nonce: '0000000000000001',
      address: 'addr1qtest',
      challengeId: '**D01C01',
      difficulty: '000000FF',
      noPreMine: 'a'.repeat(64),
      latestSubmission: '2025-10-30T23:59:59.000Z',
      noPreMineHour: '1730332799',
      expectedValid: true
    },
    // Caso 2: Com dificuldade média
    {
      nonce: '0000000000000002',
      address: 'addr1qtest',
      challengeId: 'D01C01', // sem **
      difficulty: '0000FFFF',
      noPreMine: 'b'.repeat(64),
      latestSubmission: '2025-10-30T23:59:59.000Z',
      noPreMineHour: '1730332799',
      expectedValid: false // provavelmente não vai atingir esta dificuldade
    }
  ];

  // Executar testes
  for (const testCase of testCases) {
    await runTest(testCase, services);
  }

  // Teste de performance e consistência
  console.log('\n🔄 Testando consistência de múltiplas validações...');
  const consistencyCase = testCases[0]; // usar o primeiro caso
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    const isValid = await services.ashmaizeService.validateSolution(
      [
        consistencyCase.nonce,
        consistencyCase.address,
        consistencyCase.challengeId,
        consistencyCase.difficulty,
        consistencyCase.noPreMine,
        consistencyCase.latestSubmission,
        consistencyCase.noPreMineHour
      ].join(''),
      consistencyCase.noPreMine,
      consistencyCase.difficulty
    );

    if (isValid !== consistencyCase.expectedValid) {
      console.error(`❌ ERRO: Inconsistência na validação #${i + 1}`);
      process.exit(1);
    }
  }

  console.log('✅ Teste de consistência passou!');
}

main().catch(console.error);