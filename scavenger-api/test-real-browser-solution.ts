import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

/**
 * Teste usando a solução REAL que funcionou no browser (D05C20)
 * Vamos tentar todos os formatos possíveis até encontrar o que gera o hash correto
 */

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`Invalid hex length: ${hex.length}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return out;
}

function utf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function testRealBrowserSolution() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  // ✅ Dados EXATOS da solução que funcionou no browser (D05C20)
  const address = 'addr1q9xr32r260axe665guaezenawgqcq279wdzm4errtrm0a98n93mnaljlx5leqqw8r69hc3gzp0dac6s03v8llu99t4gqkn0qzd';
  const nonce = '000516aab60ae713'; // salt do browser
  const challengeId = '**D05C20'; // COM asteriscos (como a API retorna)
  const difficulty = '00001FFF';
  const noPreMine = '033849ee29371141f2a9e546d8f4c0e84cab90a95230ef39823e84dacfc57b9a';
  const latestSubmission = '2025-11-04T18:59:59.000Z';
  const noPreMineHour = '529096956'; // String numérica

  // Hash esperado do browser (começa com zeros - válido para difficulty 00001FFF)
  // O hash no JSON pode não ser o hash do preimage, mas vamos tentar encontrar
  console.log('🧪 Testando solução REAL do browser (D05C20)\n');
  console.log(`Address: ${address.substring(0, 30)}...`);
  console.log(`Nonce: ${nonce}`);
  console.log(`Challenge ID: ${challengeId}`);
  console.log(`Difficulty: ${difficulty}`);
  console.log(`noPreMine: ${noPreMine.substring(0, 20)}...`);
  console.log(`noPreMineHour: ${noPreMineHour}\n`);

  // Teste 1: Formato misto (hex + UTF-8) COM asteriscos
  console.log('📝 Teste 1: Formato misto COM asteriscos no challenge_id');
  const parts1: Uint8Array[] = [
    hexToBytes(nonce),
    utf8(address),
    utf8(challengeId), // COM **
    hexToBytes(difficulty),
    hexToBytes(noPreMine),
    utf8(latestSubmission),
    utf8(noPreMineHour),
  ];
  const preimage1 = new Uint8Array(parts1.reduce((acc, p) => acc + p.length, 0));
  let offset = 0;
  for (const p of parts1) { preimage1.set(p, offset); offset += p.length; }
  const hash1 = wasm.computeHash(preimage1, noPreMine);
  const isValid1 = wasm.validateSolution(preimage1, noPreMine, difficulty);
  console.log(`   Preimage length: ${preimage1.length} bytes`);
  console.log(`   Hash: ${hash1}`);
  console.log(`   Hash starts with: ${hash1.substring(0, 8)}`);
  console.log(`   Válido: ${isValid1 ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 2: Formato misto SEM asteriscos
  console.log('📝 Teste 2: Formato misto SEM asteriscos no challenge_id');
  const challengeIdClean = challengeId.replace(/^\*\*/, '');
  const parts2: Uint8Array[] = [
    hexToBytes(nonce),
    utf8(address),
    utf8(challengeIdClean), // SEM **
    hexToBytes(difficulty),
    hexToBytes(noPreMine),
    utf8(latestSubmission),
    utf8(noPreMineHour),
  ];
  const preimage2 = new Uint8Array(parts2.reduce((acc, p) => acc + p.length, 0));
  offset = 0;
  for (const p of parts2) { preimage2.set(p, offset); offset += p.length; }
  const hash2 = wasm.computeHash(preimage2, noPreMine);
  const isValid2 = wasm.validateSolution(preimage2, noPreMine, difficulty);
  console.log(`   Preimage length: ${preimage2.length} bytes`);
  console.log(`   Hash: ${hash2}`);
  console.log(`   Hash starts with: ${hash2.substring(0, 8)}`);
  console.log(`   Válido: ${isValid2 ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 3: String concatenada (formato SolutionService)
  console.log('📝 Teste 3: String concatenada (formato SolutionService)');
  const preimage3Str = `${nonce}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  const preimage3 = utf8(preimage3Str);
  const hash3 = wasm.computeHash(preimage3, noPreMine);
  const isValid3 = wasm.validateSolution(preimage3, noPreMine, difficulty);
  console.log(`   Preimage length: ${preimage3Str.length} chars (${preimage3.length} bytes)`);
  console.log(`   Hash: ${hash3}`);
  console.log(`   Hash starts with: ${hash3.substring(0, 8)}`);
  console.log(`   Válido: ${isValid3 ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 4: String concatenada SEM asteriscos
  console.log('📝 Teste 4: String concatenada SEM asteriscos');
  const preimage4Str = `${nonce}${address}${challengeIdClean}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;
  const preimage4 = utf8(preimage4Str);
  const hash4 = wasm.computeHash(preimage4, noPreMine);
  const isValid4 = wasm.validateSolution(preimage4, noPreMine, difficulty);
  console.log(`   Preimage length: ${preimage4Str.length} chars (${preimage4.length} bytes)`);
  console.log(`   Hash: ${hash4}`);
  console.log(`   Hash starts with: ${hash4.substring(0, 8)}`);
  console.log(`   Válido: ${isValid4 ? '✅ SIM' : '❌ NÃO'}\n`);

  // ✅ Verificar qual formato gera hash válido
  console.log('📊 Resumo:');
  console.log(`   Teste 1 (misto COM **): ${isValid1 ? '✅ VÁLIDO' : '❌ inválido'}`);
  console.log(`   Teste 2 (misto SEM **): ${isValid2 ? '✅ VÁLIDO' : '❌ inválido'}`);
  console.log(`   Teste 3 (string COM **): ${isValid3 ? '✅ VÁLIDO' : '❌ inválido'}`);
  console.log(`   Teste 4 (string SEM **): ${isValid4 ? '✅ VÁLIDO' : '❌ inválido'}`);

  if (isValid1 || isValid2 || isValid3 || isValid4) {
    console.log('\n🎉 ENCONTRAMOS O FORMATO CORRETO!');
    if (isValid1) console.log('   ✅ Formato correto: Misto COM asteriscos');
    if (isValid2) console.log('   ✅ Formato correto: Misto SEM asteriscos');
    if (isValid3) console.log('   ✅ Formato correto: String COM asteriscos');
    if (isValid4) console.log('   ✅ Formato correto: String SEM asteriscos');
  } else {
    console.log('\n⚠️  Nenhum formato gerou hash válido com este nonce específico.');
    console.log('   Isso pode significar que:');
    console.log('   1. O nonce não é válido para este endereço/challenge');
    console.log('   2. O formato ainda está diferente');
    console.log('   3. Precisamos testar com um nonce que realmente resolveu');
  }
}

testRealBrowserSolution().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

