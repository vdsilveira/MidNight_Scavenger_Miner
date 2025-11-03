import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

/**
 * Teste para validar se nosso formato de preimage gera o mesmo hash que o browser
 * usando uma solução REAL que funcionou no browser
 */

async function testRealSolution() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  // Dados da solução REAL do browser (D05C20)
  const address = 'addr1q9xr32r260axe665guaezenawgqcq279wdzm4errtrm0a98n93mnaljlx5leqqw8r69hc3gzp0dac6s03v8llu99t4gqkn0qzd';
  const nonce = '000516aab60ae713'; // salt do browser
  const challengeId = '**D05C20'; // Note: tem asteriscos!
  const difficulty = '00001FFF';
  const noPreMine = '033849ee29371141f2a9e546d8f4c0e84cab90a95230ef39823e84dacfc57b9a';
  const latestSubmission = '2025-11-04T18:59:59.000Z';
  const noPreMineHour = '529096956'; // String numérica

  // Hash esperado do browser (começa com 00000a...)
  const expectedHashStart = '00000a874f00fa';

  console.log('🧪 Testando solução REAL do browser\n');
  console.log(`Address: ${address.substring(0, 30)}...`);
  console.log(`Nonce: ${nonce}`);
  console.log(`Challenge ID: ${challengeId}`);
  console.log(`Difficulty: ${difficulty}`);
  console.log(`noPreMine: ${noPreMine.substring(0, 20)}...`);
  console.log(`noPreMineHour: ${noPreMineHour}`);
  console.log(`Expected hash start: ${expectedHashStart}\n`);

  // Teste 1: Formato atual (string concatenada)
  const preimage1 = `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  const preimageBytes1 = new TextEncoder().encode(preimage1);
  const hash1 = wasm.computeHash(preimageBytes1, noPreMine);
  const isValid1 = wasm.validateSolution(preimageBytes1, noPreMine, difficulty);
  
  console.log('📝 Teste 1: Formato atual (string concatenada)');
  console.log(`   Preimage length: ${preimage1.length} chars`);
  console.log(`   Hash: ${hash1.substring(0, 16)}...`);
  console.log(`   Hash completo: ${hash1}`);
  console.log(`   Válido: ${isValid1}`);
  console.log(`   Match esperado: ${hash1.startsWith(expectedHashStart) ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 2: Sem asteriscos no challenge_id
  const challengeIdNoAsterisk = challengeId.replace(/\*\*/g, '');
  const preimage2 = `${nonce}${address}${challengeIdNoAsterisk}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  const preimageBytes2 = new TextEncoder().encode(preimage2);
  const hash2 = wasm.computeHash(preimageBytes2, noPreMine);
  const isValid2 = wasm.validateSolution(preimageBytes2, noPreMine, difficulty);
  
  console.log('📝 Teste 2: Sem asteriscos no challenge_id');
  console.log(`   Challenge ID: ${challengeIdNoAsterisk}`);
  console.log(`   Preimage length: ${preimage2.length} chars`);
  console.log(`   Hash: ${hash2.substring(0, 16)}...`);
  console.log(`   Hash completo: ${hash2}`);
  console.log(`   Válido: ${isValid2}`);
  console.log(`   Match esperado: ${hash2.startsWith(expectedHashStart) ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 3: Ordem diferente - challenge_id ANTES de address
  const preimage3 = `${nonce}${challengeId}${address}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  const preimageBytes3 = new TextEncoder().encode(preimage3);
  const hash3 = wasm.computeHash(preimageBytes3, noPreMine);
  const isValid3 = wasm.validateSolution(preimageBytes3, noPreMine, difficulty);
  
  console.log('📝 Teste 3: Ordem diferente (challenge_id antes de address)');
  console.log(`   Preimage length: ${preimage3.length} chars`);
  console.log(`   Hash: ${hash3.substring(0, 16)}...`);
  console.log(`   Hash completo: ${hash3}`);
  console.log(`   Válido: ${isValid3}`);
  console.log(`   Match esperado: ${hash3.startsWith(expectedHashStart) ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 4: Usar pubkey hash ao invés de address (sugestão GPT)
  const pubkey = '1eada93edcabb6a658b9752d0a8cb8c0eb2d401a0428197a3a255e886903afc6'; // do JSON
  const pubkeyHash = Buffer.from(pubkey, 'hex'); // 32 bytes
  const preimage4 = Buffer.concat([
    Buffer.from(nonce, 'hex'), // 8 bytes
    pubkeyHash, // 32 bytes
    Buffer.from(challengeId.replace(/\*\*/g, ''), 'utf8'), // challenge_id como UTF-8
    Buffer.from(difficulty, 'hex'), // 4 bytes
    Buffer.from(noPreMine, 'hex'), // 32 bytes
    Buffer.from(latestSubmission, 'utf8'), // timestamp UTF-8
    Buffer.from(noPreMineHour, 'utf8'), // hour UTF-8
  ]);
  const hash4 = wasm.computeHash(preimage4, noPreMine);
  const isValid4 = wasm.validateSolution(preimage4, noPreMine, difficulty);
  
  console.log('📝 Teste 4: Formato binário (pubkey hash ao invés de address)');
  console.log(`   Pubkey: ${pubkey.substring(0, 20)}...`);
  console.log(`   Preimage length: ${preimage4.length} bytes`);
  console.log(`   Hash: ${hash4.substring(0, 16)}...`);
  console.log(`   Hash completo: ${hash4}`);
  console.log(`   Válido: ${isValid4}`);
  console.log(`   Match esperado: ${hash4.startsWith(expectedHashStart) ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 3: Verificar se o challenge_id atual do backend tem asteriscos
  const current = challengeService.getCurrentChallenge();
  if (current.code === 'active' && current.challenge) {
    console.log('📝 Challenge atual do backend:');
    console.log(`   Challenge ID: "${current.challenge.challenge_id}"`);
    console.log(`   Tem asteriscos: ${current.challenge.challenge_id.includes('**') ? '✅ SIM' : '❌ NÃO'}\n`);
  }
}

testRealSolution().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

