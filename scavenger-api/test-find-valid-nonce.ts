import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

/**
 * Teste para encontrar um nonce válido usando o formato atual
 * Se encontrarmos um nonce válido, significa que o formato está correto!
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

async function findValidNonce() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  // Dados do challenge atual
  const challenge = challengeService.getCurrentChallenge();
  if (challenge.code !== 'active' || !challenge.challenge) {
    console.error('❌ Challenge não está ativo');
    return;
  }

  const challengeData = challenge.challenge;
  const address = 'addr1q9xr32r260axe665guaezenawgqcq279wdzm4errtrm0a98n93mnaljlx5leqqw8r69hc3gzp0dac6s03v8llu99t4gqkn0qzd';

  console.log('🔍 Procurando nonce válido...\n');
  console.log(`Challenge: ${challengeData.challenge_id}`);
  console.log(`Address: ${address.substring(0, 30)}...`);
  console.log(`Difficulty: ${challengeData.difficulty}\n`);

  // Começar de um nonce aleatório e tentar alguns milhares
  const baseNonce = BigInt('0x' + '000516aab60ae713'); // Nonce do browser
  let attempts = 0;
  const maxAttempts = 100000;

  console.log(`Testando ${maxAttempts} nonces começando de ${baseNonce.toString(16).padStart(16, '0')}...\n`);

  for (let i = 0; i < maxAttempts; i++) {
    const nonce = (baseNonce + BigInt(i)).toString(16).padStart(16, '0');
    
    const preimageBytes = buildPreimageBytes(
      nonce,
      address,
      challengeData.challenge_id,
      challengeData.difficulty,
      challengeData.no_pre_mine,
      challengeData.latest_submission,
      challengeData.no_pre_mine_hour,
    );

    const isValid = wasm.validateSolution(
      preimageBytes,
      challengeData.no_pre_mine,
      challengeData.difficulty,
    );

    attempts++;

    if (isValid) {
      const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
      console.log('\n🎉 NONCE VÁLIDO ENCONTRADO!');
      console.log(`   Nonce: ${nonce}`);
      console.log(`   Hash: ${hash}`);
      console.log(`   Tentativas: ${attempts}`);
      console.log(`   ✅ FORMATO CORRETO! O código está funcionando!\n`);
      return;
    }

    if (attempts % 10000 === 0) {
      const hash = wasm.computeHash(preimageBytes, challengeData.no_pre_mine);
      console.log(`   Tentativas: ${attempts}, último nonce: ${nonce}, hash: ${hash.substring(0, 16)}...`);
    }
  }

  console.log(`\n⚠️  Nenhum nonce válido encontrado em ${attempts} tentativas.`);
  console.log(`   Isso pode significar:`);
  console.log(`   1. O formato ainda pode estar errado`);
  console.log(`   2. A dificuldade é muito alta (precisa de mais tentativas)`);
  console.log(`   3. Este endereço específico precisa de mais tentativas\n`);
}

findValidNonce().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

