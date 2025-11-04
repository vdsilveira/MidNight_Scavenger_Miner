/**
 * Teste simplificado para validação do hash AshMaize
 */
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

async function testHashValidation() {
  console.log('🧪 Teste de Validação de Hash AshMaize\n');

  // Criar instância do serviço WASM diretamente
  const wasmService = new AshmaizeWasmService();

  // Caso de teste com dificuldade baixa
  const testCase = {
    nonce: '0000000000000001',
    address: 'addr1qtest',
    challengeId: '**D01C01',
    difficulty: '000000FF',
    noPreMine: 'a'.repeat(64),
    latestSubmission: '2025-10-30T23:59:59.000Z',
    noPreMineHour: '1730332799'
  };

  // Gerar preimage como o browser faz
  const preimage = [
    testCase.nonce,
    testCase.address,
    testCase.challengeId,
    testCase.difficulty,
    testCase.noPreMine,
    testCase.latestSubmission,
    testCase.noPreMineHour
  ].join('');

  console.log('Preimage:', preimage);

  try {
    // Calcular hash
    const hash = wasmService.computeHash(preimage, testCase.noPreMine);
    console.log('\nHash calculado:', hash);

    // Validar solução
    const isValid = wasmService.validateSolution(
      preimage,
      testCase.noPreMine,
      testCase.difficulty
    );

    // Verificar manualmente a dificuldade
    const hashPrefix = hash.substring(0, 8);
    const hashNum = parseInt(hashPrefix, 16);
    const targetNum = parseInt(testCase.difficulty, 16);
    const manualCheck = (hashNum | targetNum) === targetNum;

    console.log('\nResultados:');
    console.log('Validação WASM:', isValid ? '✅ Válido' : '❌ Inválido');
    console.log('Validação Manual:', manualCheck ? '✅ Válido' : '❌ Inválido');
    console.log(`Hash Prefix: ${hashPrefix} (${hashNum})`);
    console.log(`Target: ${testCase.difficulty} (${targetNum})`);

    if (isValid !== manualCheck) {
      console.error('\n❌ ERRO: Divergência entre validação WASM e manual!');
      process.exit(1);
    }

    // Testar consistência com múltiplas validações
    console.log('\n🔄 Testando consistência...');
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      const check = wasmService.validateSolution(
        preimage,
        testCase.noPreMine,
        testCase.difficulty
      );
      if (check !== isValid) {
        console.error(`❌ ERRO: Inconsistência na validação #${i + 1}`);
        process.exit(1);
      }
    }

    console.log('✅ Teste de consistência passou!');
    console.log('\n🎉 Todos os testes passaram!');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  }
}

// Executar teste
testHashValidation().catch(console.error);