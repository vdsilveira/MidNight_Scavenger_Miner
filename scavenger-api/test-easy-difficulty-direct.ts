// Teste com dificuldade MUITO BAIXA para forçar encontrar solução
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { ChallengeService } from './src/challenge/challenge.service';

async function testEasyDifficulty() {
  console.log('🔍 Teste com dificuldade MUITO BAIXA...\n');
  
  const wasm = new AshmaizeWasmService();
  const challengeService = new ChallengeService();
  
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }
  
  const challengeData = challenge.challenge;
  const address = 'addr1qtest123456789012345678901234567890123456789012345678901234567890';
  
  // Usar dificuldade MUITO BAIXA: 0x000000FF (apenas últimos 8 bits)
  const easyDifficulty = '000000FF';
  const target = parseInt(easyDifficulty, 16);
  
  console.log('📋 Configuração:');
  console.log(`   challenge_id: ${challengeData.challenge_id}`);
  console.log(`   difficulty REAL: ${challengeData.difficulty}`);
  console.log(`   difficulty TESTE: ${easyDifficulty} (muito mais fácil!)`);
  console.log(`   no_pre_mine: ${challengeData.no_pre_mine.substring(0, 20)}...\n`);
  
  console.log('🎲 Procurando solução com dificuldade fácil (máximo 10000 tentativas)...\n');
  
  const startTime = Date.now();
  let found = false;
  let attempts = 0;
  
  for (let i = 0; i < 10000 && !found; i++) {
    const nonce = Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0');
    const preimageString = [
      nonce,
      address,
      challengeData.challenge_id,
      easyDifficulty, // Usar dificuldade fácil
      challengeData.no_pre_mine,
      challengeData.latest_submission,
      challengeData.no_pre_mine_hour,
    ].join('');
    
    const hash = wasm.computeHash(preimageString, challengeData.no_pre_mine);
    const hashPrefix = hash.substring(0, 8);
    const hashValue = parseInt(hashPrefix, 16);
    const meetsDifficulty = (hashValue | target) === target;
    
    attempts++;
    
    if (meetsDifficulty) {
      found = true;
      const elapsed = (Date.now() - startTime) / 1000;
      console.log('🎉 SOLUÇÃO ENCONTRADA!');
      console.log(`   ✅ O código ESTÁ FUNCIONANDO!`);
      console.log(`   Nonce: ${nonce}`);
      console.log(`   Hash: ${hash.substring(0, 32)}...`);
      console.log(`   Hash prefix: ${hashPrefix}`);
      console.log(`   Tentativas: ${attempts}`);
      console.log(`   Tempo: ${elapsed.toFixed(2)}s`);
      console.log(`   Taxa: ${(attempts / elapsed).toFixed(0)} H/s\n`);
      
      // Agora testar com a dificuldade REAL
      console.log('🔍 Testando o mesmo nonce com dificuldade REAL...');
      const preimageReal = [
        nonce,
        address,
        challengeData.challenge_id,
        challengeData.difficulty, // Dificuldade real
        challengeData.no_pre_mine,
        challengeData.latest_submission,
        challengeData.no_pre_mine_hour,
      ].join('');
      
      const hashReal = wasm.computeHash(preimageReal, challengeData.no_pre_mine);
      const hashPrefixReal = hashReal.substring(0, 8);
      const hashValueReal = parseInt(hashPrefixReal, 16);
      const targetReal = parseInt(challengeData.difficulty, 16);
      const meetsRealDifficulty = (hashValueReal | targetReal) === targetReal;
      
      console.log(`   Hash com dificuldade real: ${hashReal.substring(0, 32)}...`);
      console.log(`   Hash prefix: ${hashPrefixReal}`);
      console.log(`   Atende dificuldade real: ${meetsRealDifficulty ? '✅ SIM' : '❌ NÃO'}\n`);
      
      return;
    }
    
    if (attempts % 1000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = attempts / elapsed;
      console.log(`   Tentativas: ${attempts}, Taxa: ${rate.toFixed(0)} H/s`);
    }
  }
  
  if (!found) {
    console.log(`\n⚠️  Não encontrou solução em ${attempts} tentativas mesmo com dificuldade fácil.`);
    console.log(`   Isso indica que pode haver um problema na implementação.\n`);
  }
}

testEasyDifficulty().catch(console.error);

