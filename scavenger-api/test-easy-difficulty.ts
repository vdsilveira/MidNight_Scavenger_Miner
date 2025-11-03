import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

/**
 * Teste com dificuldade MUITO FÁCIL para validar se os hashes estão sendo gerados corretamente
 * Se encontrarmos soluções rapidamente, significa que o formato está correto!
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

function buildPreimageBytes(
  nonce: string,
  address: string,
  challengeId: string,
  difficulty: string,
  noPreMine: string,
  latestSubmission: string,
  noPreMineHour: string,
): Uint8Array {
  const parts: Uint8Array[] = [
    hexToBytes(nonce),
    utf8(address),
    utf8(challengeId), // COM ** se presente
    hexToBytes(difficulty),
    hexToBytes(noPreMine),
    utf8(latestSubmission),
    utf8(noPreMineHour),
  ];
  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

async function testWithEasyDifficulty() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  // Obter challenge atual
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }

  const challengeData = challenge.challenge;
  const address = 'addr1q9xr32r260axe665guaezenawgqcq279wdzm4errtrm0a98n93mnaljlx5leqqw8r69hc3gzp0dac6s03v8llu99t4gqkn0qzd';

  // ✅ DIFICULDADE MUITO FÁCIL (apenas 1 bit zero) - deve encontrar rapidamente
  const easyDifficulty = 'FFFFFFFE'; // Apenas o último bit precisa ser zero
  
  console.log('🧪 Testando com dificuldade MUITO FÁCIL para validar formato\n');
  console.log(`Challenge: ${challengeData.challenge_id}`);
  console.log(`Address: ${address.substring(0, 30)}...`);
  console.log(`Dificuldade real: ${challengeData.difficulty}`);
  console.log(`Dificuldade teste: ${easyDifficulty} (muito fácil - 1 bit zero)\n`);

  const baseNonce = BigInt('0x0123456789abcdef');
  let attempts = 0;
  const maxAttempts = 100000;

  console.log(`Procurando solução com dificuldade fácil (máximo ${maxAttempts} tentativas)...\n`);

  for (let i = 0; i < maxAttempts; i++) {
    const nonce = (baseNonce + BigInt(i)).toString(16).padStart(16, '0');
    
    const preimageBytes = buildPreimageBytes(
      nonce,
      address,
      challengeData.challenge_id,
      easyDifficulty, // ✅ Usar dificuldade fácil
      challengeData.no_pre_mine,
      challengeData.latest_submission,
      challengeData.no_pre_mine_hour,
    );

    const isValid = wasm.validateSolution(
      preimageBytes,
      challengeData.no_pre_mine,
      easyDifficulty, // ✅ Usar dificuldade fácil
    );

    attempts++;

    if (isValid) {
      const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
      console.log('\n🎉 SOLUÇÃO ENCONTRADA COM DIFICULDADE FÁCIL!');
      console.log(`   ✅ FORMATO ESTÁ CORRETO!`);
      console.log(`   Nonce: ${nonce}`);
      console.log(`   Hash: ${hash}`);
      console.log(`   Hash starts with: ${hash.substring(0, 8)}`);
      console.log(`   Tentativas: ${attempts}\n`);
      
      // Agora testar com a dificuldade real para ver se também funciona
      console.log('🔍 Testando o mesmo nonce com dificuldade REAL...');
      const isValidReal = wasm.validateSolution(
        preimageBytes,
        challengeData.no_pre_mine,
        challengeData.difficulty, // Dificuldade real
      );
      const hashReal = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
      console.log(`   Hash: ${hashReal}`);
      console.log(`   Válido para dificuldade real: ${isValidReal ? '✅ SIM' : '❌ NÃO'}\n`);
      
      return;
    }

    if (attempts % 10000 === 0) {
      const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
      console.log(`   Tentativas: ${attempts}, último nonce: ${nonce}, hash: ${hash.substring(0, 16)}...`);
    }
  }

  console.log(`\n⚠️  Não encontrou solução em ${attempts} tentativas mesmo com dificuldade fácil.`);
  console.log(`   Isso pode indicar que o formato está INCORRETO.\n`);
}

testWithEasyDifficulty().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

