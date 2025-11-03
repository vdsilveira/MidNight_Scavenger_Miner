import { ChallengeService } from './src/challenge/challenge.service';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`Invalid hex length: ${hex.length}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
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
    utf8(challengeId),
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

async function main() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  const current = challengeService.getCurrentChallenge();
  if (current.code !== 'active' || !current.challenge) {
    console.log('No active challenge.');
    return;
  }

  const ch = current.challenge;
  // Reduced difficulty: require last 4 bits zero (≈1/16)
  const easyDifficulty = 'FFFFF000';

  // Dummy address for testing; replace with a registered one if needed
  const address = 'addr1qtestaddressforhashingonly';

  let nonceBig = BigInt('0x0123456789ABCDEF');
  const start = Date.now();
  let attempts = 0;

  while (true) {
    const nonce = nonceBig.toString(16).padStart(16, '0').substring(0, 16);
    const preimageBytes = buildPreimageBytes(
      nonce,
      address,
      ch.challenge_id,
      easyDifficulty,
      ch.no_pre_mine,
      ch.latest_submission,
      ch.no_pre_mine_hour,
    );

    const ok = wasm.validateSolution(preimageBytes, ch.no_pre_mine, easyDifficulty);
    attempts++;
    if (ok) {
      const elapsed = (Date.now() - start) / 1000;
      const hps = attempts / Math.max(1e-9, elapsed);
      const hashHex = wasm.computeHash(preimageBytes, ch.no_pre_mine);
      console.log('✅ Found valid solution (easy difficulty)');
      console.log(`   Nonce: ${nonce}`);
      console.log(`   Hash : ${hashHex.substring(0, 16)}...`);
      console.log(`   Attempts: ${attempts}, time: ${elapsed.toFixed(2)}s, ~${hps.toFixed(1)} H/s`);
      break;
    }

    nonceBig += 1n;
    if (attempts % 10000 === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const hps = attempts / Math.max(1e-9, elapsed);
      console.log(`⏳ Attempts: ${attempts}, ${hps.toFixed(1)} H/s`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


