// Teste de mineração com estatísticas detalhadas
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { ChallengeService } from './src/challenge/challenge.service';

async function testMiningWithStats() {
  console.log('⛏️  Teste de mineração com estatísticas...\n');
  
  const wasm = new AshmaizeWasmService();
  const challengeService = new ChallengeService();
  
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }
  
  const challengeData = challenge.challenge;
  const address = 'addr1qtest123456789012345678901234567890123456789012345678901234567890';
  const target = parseInt(challengeData.difficulty, 16);
  
  console.log('📋 Challenge:');
  console.log(`   ID: ${challengeData.challenge_id}`);
  console.log(`   Difficulty: ${challengeData.difficulty} (${target} decimal)`);
  console.log(`   no_pre_mine: ${challengeData.no_pre_mine.substring(0, 20)}...\n`);
  
  // Calcular probabilidade
  const targetBits = target.toString(2).padStart(32, '0');
  const bitsSet = targetBits.split('1').length - 1;
  const probability = Math.pow(2, -bitsSet);
  const expectedAttempts = Math.round(1 / probability);
  
  console.log('📊 Estatísticas:');
  console.log(`   Bits definidos no target: ${bitsSet}`);
  console.log(`   Probabilidade: ~1 em ${expectedAttempts}`);
  console.log(`   Tentativas esperadas: ~${expectedAttempts.toLocaleString()}\n`);
  
  // Testar com 10000 tentativas
  console.log('🎲 Testando 10000 nonces aleatórios...');
  const startTime = Date.now();
  let found = 0;
  let closestHash = '';
  let closestValue = Infinity;
  let closestDiff = Infinity;
  
  for (let i = 0; i < 10000; i++) {
    const nonce = Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0');
    const preimageString = [
      nonce,
      address,
      challengeData.challenge_id,
      challengeData.difficulty,
      challengeData.no_pre_mine,
      challengeData.latest_submission,
      challengeData.no_pre_mine_hour,
    ].join('');
    
    const hash = wasm.computeHash(preimageString, challengeData.no_pre_mine);
    const hashPrefix = hash.substring(0, 8);
    const hashValue = parseInt(hashPrefix, 16);
    const meetsDifficulty = (hashValue | target) === target;
    
    if (meetsDifficulty) {
      found++;
      console.log(`   ✅ SOLUÇÃO ENCONTRADA! Nonce: ${nonce}, Hash: ${hash.substring(0, 16)}...`);
    }
    
    // Encontrar o hash mais próximo
    const diff = Math.abs((hashValue | target) - target);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestHash = hashPrefix;
      closestValue = hashValue;
    }
    
    if ((i + 1) % 1000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      console.log(`   Progresso: ${i + 1}/10000 (${((i + 1) / 10000 * 100).toFixed(1)}%) - ${rate.toFixed(0)} H/s - Encontrados: ${found}`);
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = 10000 / elapsed;
  
  console.log(`\n📊 Resultados finais:`);
  console.log(`   Tentativas: 10000`);
  console.log(`   Soluções encontradas: ${found}`);
  console.log(`   Tempo: ${elapsed.toFixed(2)}s`);
  console.log(`   Taxa: ${rate.toFixed(0)} H/s`);
  console.log(`   Taxa esperada: ~${expectedAttempts} tentativas por solução`);
  console.log(`   Soluções esperadas: ~${(10000 / expectedAttempts).toFixed(2)}`);
  console.log(`   Soluções encontradas: ${found}`);
  console.log(`   Hash mais próximo: ${closestHash} (diff: ${closestDiff})\n`);
  
  if (found === 0) {
    console.log('⚠️  Nenhuma solução encontrada em 10000 tentativas.');
    console.log(`   Isso pode ser normal se a probabilidade real for menor que ${(1/10000).toFixed(6)}`);
    console.log(`   Ou pode indicar um problema na implementação.\n`);
  } else {
    console.log('✅ Soluções encontradas! O código está funcionando corretamente!\n');
  }
}

testMiningWithStats().catch(console.error);

