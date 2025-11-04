// Teste para verificar se o hash está sendo calculado corretamente
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { ChallengeService } from './src/challenge/challenge.service';

async function testHashVerification() {
  console.log('🔍 Verificando cálculo de hash...\n');
  
  const wasm = new AshmaizeWasmService();
  const challengeService = new ChallengeService();
  
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }
  
  const challengeData = challenge.challenge;
  const address = 'addr1qtest123456789012345678901234567890123456789012345678901234567890';
  
  // Testar com um nonce fixo para verificar se o hash é determinístico
  const testNonce = '0000000000000001';
  
  // Construir preimage exatamente como no browser
  const preimageString = [
    testNonce,
    address,
    challengeData.challenge_id,
    challengeData.difficulty,
    challengeData.no_pre_mine,
    challengeData.latest_submission,
    challengeData.no_pre_mine_hour,
  ].join('');
  
  console.log('📋 Configuração:');
  console.log(`   challenge_id: ${challengeData.challenge_id}`);
  console.log(`   difficulty: ${challengeData.difficulty}`);
  console.log(`   no_pre_mine: ${challengeData.no_pre_mine}`);
  console.log(`   latest_submission: ${challengeData.latest_submission}`);
  console.log(`   no_pre_mine_hour: ${challengeData.no_pre_mine_hour}`);
  console.log(`   nonce: ${testNonce}`);
  console.log(`   address: ${address.substring(0, 20)}...`);
  console.log(`\n   Preimage length: ${preimageString.length} chars`);
  console.log(`   Preimage first 50: ${preimageString.substring(0, 50)}...`);
  console.log(`   Preimage last 50: ...${preimageString.substring(preimageString.length - 50)}\n`);
  
  // Calcular hash múltiplas vezes para verificar determinismo
  console.log('🔨 Testando determinismo (3 tentativas):');
  const hashes: string[] = [];
  for (let i = 0; i < 3; i++) {
    const hash = wasm.computeHash(preimageString, challengeData.no_pre_mine);
    hashes.push(hash);
    console.log(`   Tentativa ${i + 1}: ${hash.substring(0, 16)}...`);
  }
  
  const allSame = hashes.every(h => h === hashes[0]);
  console.log(`\n   Determinismo: ${allSame ? '✅ SIM' : '❌ NÃO'}`);
  if (!allSame) {
    console.error('   ⚠️  ERRO: Hash não é determinístico!');
  }
  
  // Testar validação de dificuldade
  console.log('\n⚙️  Testando validação de dificuldade:');
  const hash = hashes[0];
  const hashPrefix = hash.substring(0, 8);
  const hashValue = parseInt(hashPrefix, 16);
  const target = parseInt(challengeData.difficulty, 16);
  const meetsDifficulty = (hashValue | target) === target;
  
  console.log(`   Hash prefix: ${hashPrefix}`);
  console.log(`   Hash value: ${hashValue} (0x${hashValue.toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   Target: ${target} (0x${target.toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   (hashValue | target): ${(hashValue | target)} (0x${(hashValue | target).toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   Atende dificuldade: ${meetsDifficulty ? '✅ SIM' : '❌ NÃO'}`);
  
  // Testar com validateSolution
  console.log('\n🔍 Testando validateSolution:');
  const isValid = wasm.validateSolution(preimageString, challengeData.no_pre_mine, challengeData.difficulty);
  console.log(`   Resultado: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
  console.log(`   Resultado esperado: ❌ INVÁLIDO (pois hash é ${hashPrefix} e target é ${challengeData.difficulty})`);
  
  // Estatísticas de probabilidade
  console.log('\n📊 Estatísticas:');
  const targetBits = target.toString(2).padStart(32, '0');
  const bitsSet = targetBits.split('1').length - 1;
  const probability = Math.pow(2, -bitsSet);
  const expectedAttempts = Math.round(1 / probability);
  console.log(`   Bits definidos no target: ${bitsSet}`);
  console.log(`   Probabilidade: ~1 em ${expectedAttempts}`);
  console.log(`   Tentativas esperadas: ~${expectedAttempts.toLocaleString()}`);
  console.log(`   Tentativas no teste: 1000`);
  console.log(`   Probabilidade de encontrar em 1000: ~${(1000 / expectedAttempts * 100).toFixed(2)}%`);
}

testHashVerification().catch(console.error);

