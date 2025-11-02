/**
 * Script para testar performance e validar mineração
 * Compara com implementação do browser
 */

import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

async function testMining() {
  console.log('🔍 Testando mineração...\n');

  const challengeService = new ChallengeService();
  const ashmaizeService = new AshmaizeWasmService();

  // Obter challenge atual
  const challenge = challengeService.getCurrentChallenge();
  
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    process.exit(1);
  }

  const challengeData = challenge.challenge;
  
  console.log('📊 Challenge Info:');
  console.log(`   Challenge ID: ${challengeData.challenge_id}`);
  console.log(`   Difficulty: ${challengeData.difficulty} (0x${challengeData.difficulty})`);
  console.log(`   Day: ${challengeData.day}`);
  console.log(`   no_pre_mine: ${challengeData.no_pre_mine.substring(0, 16)}...`);
  console.log(`   no_pre_mine_hour: ${challengeData.no_pre_mine_hour}`);
  console.log(`   latest_submission: ${challengeData.latest_submission}`);
  console.log();

  // Testar alguns nonces
  const testAddress = 'addr1qtest123456789012345678901234567890123456789012345678901234567890';
  
  console.log('🧪 Testando diferentes nonces...\n');

  const testNonces = [
    '0000000000000000',
    '0000000000000001',
    '0000000000000100',
    '0000000000010000',
    '0000000100000000',
    '1000000000000000',
    'ffffffffffffffff',
  ];

  let validCount = 0;
  let totalTime = 0;

  for (const nonce of testNonces) {
    // Construir preimage
    const preimage = `${nonce}${testAddress}${challengeData.challenge_id}${challengeData.difficulty}${challengeData.no_pre_mine}${challengeData.latest_submission}${challengeData.no_pre_mine_hour}`;
    
    const startTime = Date.now();
    
    try {
      // Calcular hash
      const hash = ashmaizeService.computeHash(preimage, challengeData.no_pre_mine);
      const hashTime = Date.now() - startTime;
      totalTime += hashTime;
      
      // Verificar dificuldade
      const isValid = ashmaizeService.validateSolution(
        preimage,
        challengeData.no_pre_mine,
        challengeData.difficulty,
      );
      
      if (isValid) {
        validCount++;
        console.log(`✅ Nonce ${nonce}: VÁLIDO!`);
        console.log(`   Hash: ${hash.substring(0, 32)}...`);
        console.log(`   Tempo: ${hashTime}ms`);
      } else {
        const hashPrefix = hash.substring(0, 8);
        console.log(`❌ Nonce ${nonce}: inválido`);
        console.log(`   Hash prefix: ${hashPrefix}`);
        console.log(`   Difficulty: ${challengeData.difficulty}`);
        console.log(`   Tempo: ${hashTime}ms`);
      }
    } catch (error: any) {
      console.error(`❌ Erro ao testar nonce ${nonce}: ${error.message}`);
    }
    
    console.log();
  }

  console.log('📊 Estatísticas:');
  console.log(`   Total testado: ${testNonces.length}`);
  console.log(`   Válidos: ${validCount}`);
  console.log(`   Tempo médio por hash: ${Math.round(totalTime / testNonces.length)}ms`);

  // Testar mineração incremental
  console.log('\n⛏️  Testando mineração incremental (100 tentativas)...\n');
  
  let nonceCounter = BigInt(0);
  const increment = BigInt(1);
  let attempts = 0;
  let found = false;
  const maxAttempts = 100;

  const miningStart = Date.now();

  while (attempts < maxAttempts && !found) {
    const nonce = nonceCounter.toString(16).padStart(16, '0');
    const preimage = `${nonce}${testAddress}${challengeData.challenge_id}${challengeData.difficulty}${challengeData.no_pre_mine}${challengeData.latest_submission}${challengeData.no_pre_mine_hour}`;
    
    try {
      const isValid = ashmaizeService.validateSolution(
        preimage,
        challengeData.no_pre_mine,
        challengeData.difficulty,
      );
      
      if (isValid) {
        const hash = ashmaizeService.computeHash(preimage, challengeData.no_pre_mine);
        console.log(`🎉 SOLUÇÃO ENCONTRADA!`);
        console.log(`   Nonce: ${nonce}`);
        console.log(`   Hash: ${hash.substring(0, 32)}...`);
        found = true;
      }
    } catch (error: any) {
      console.error(`Erro: ${error.message}`);
      break;
    }
    
    nonceCounter += increment;
    attempts++;
    
    if (attempts % 10 === 0) {
      process.stdout.write(`\r   Tentativas: ${attempts}...`);
    }
  }

  const miningTime = Date.now() - miningStart;
  
  console.log(`\n   Tentativas: ${attempts}`);
  console.log(`   Tempo total: ${miningTime}ms`);
  console.log(`   Tempo médio: ${Math.round(miningTime / attempts)}ms por tentativa`);
  
  if (!found) {
    console.log('\n⚠️  Nenhuma solução encontrada em 100 tentativas');
    console.log('   Isso é normal - mineração pode levar muito tempo dependendo da dificuldade');
  }
}

testMining().catch(console.error);

