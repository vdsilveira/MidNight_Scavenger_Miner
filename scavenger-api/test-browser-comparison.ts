// Teste para comparar diretamente com o código do browser
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { ChallengeService } from './src/challenge/challenge.service';

async function testBrowserComparison() {
  console.log('🔍 Testando comparação direta com browser...\n');
  
  const wasm = new AshmaizeWasmService();
  const challengeService = new ChallengeService();
  
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }
  
  const challengeData = challenge.challenge;
  const address = 'addr1qtest123456789012345678901234567890123456789012345678901234567890';
  
  console.log('📋 Dados do Challenge:');
  console.log(`   challenge_id: ${challengeData.challenge_id}`);
  console.log(`   difficulty: ${challengeData.difficulty}`);
  console.log(`   no_pre_mine: ${challengeData.no_pre_mine.substring(0, 20)}...`);
  console.log(`   latest_submission: ${challengeData.latest_submission}`);
  console.log(`   no_pre_mine_hour: ${challengeData.no_pre_mine_hour}\n`);
  
  // Testar com nonce específico
  const testNonce = '0000000000000001';
  
  // Construir preimage EXATAMENTE como no browser
  const preimageString = [
    testNonce,
    address,
    challengeData.challenge_id,
    challengeData.difficulty,
    challengeData.no_pre_mine,
    challengeData.latest_submission,
    challengeData.no_pre_mine_hour,
  ].join('');
  
  console.log('📝 Preimage construído:');
  console.log(`   Length: ${preimageString.length}`);
  console.log(`   First 100 chars: ${preimageString.substring(0, 100)}...`);
  console.log(`   Last 100 chars: ...${preimageString.substring(preimageString.length - 100)}\n`);
  
  // Codificar como UTF-8
  const preimageBytes = new TextEncoder().encode(preimageString);
  console.log(`   Bytes length: ${preimageBytes.length}\n`);
  
  // Calcular hash
  console.log('🔨 Calculando hash...');
  const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
  console.log(`   Hash: ${hash}`);
  console.log(`   Hash length: ${hash.length}`);
  console.log(`   Hash prefix (8 chars): ${hash.substring(0, 8)}\n`);
  
  // Verificar dificuldade
  const hashPrefix = hash.substring(0, 8);
  const hashValue = parseInt(hashPrefix, 16) >>> 0;
  const target = parseInt(challengeData.difficulty, 16) >>> 0;
  const meetsDifficulty = (hashValue | target) === target;
  
  console.log('⚙️  Validação de Dificuldade:');
  console.log(`   Hash prefix: ${hashPrefix}`);
  console.log(`   Hash value (uint32): ${hashValue} (0x${hashValue.toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   Target (uint32): ${target} (0x${target.toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   (hashValue | target): ${(hashValue | target)} (0x${(hashValue | target).toString(16).padStart(8, '0').toUpperCase()})`);
  console.log(`   Atende dificuldade: ${meetsDifficulty ? '✅ SIM' : '❌ NÃO'}\n`);
  
  // Testar múltiplos nonces aleatórios
  console.log('🎲 Testando 1000 nonces aleatórios...');
  let found = 0;
  for (let i = 0; i < 1000; i++) {
    const nonce = Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0');
    const preimageStr = [
      nonce,
      address,
      challengeData.challenge_id,
      challengeData.difficulty,
      challengeData.no_pre_mine,
      challengeData.latest_submission,
      challengeData.no_pre_mine_hour,
    ].join('');
    const preimageBytes = new TextEncoder().encode(preimageStr);
    const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
    const hashPrefix = hash.substring(0, 8);
    const hashValue = parseInt(hashPrefix, 16) >>> 0;
    const target = parseInt(challengeData.difficulty, 16) >>> 0;
    if ((hashValue | target) === target) {
      found++;
      console.log(`   ✅ Nonce ${nonce} encontrado! Hash: ${hash.substring(0, 16)}...`);
    }
  }
  console.log(`\n📊 Encontrados ${found} hashes válidos em 1000 tentativas\n`);
}

testBrowserComparison().catch(console.error);

