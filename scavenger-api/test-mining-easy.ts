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

type Challenge = {
  challenge_id: string;
  difficulty: string;
  no_pre_mine: string;
  latest_submission: string;
  no_pre_mine_hour: string;
};

class MinerScheduler {
  private readonly allAddresses: string[];
  private queue: string[] = [];
  private completed = new Set<string>();
  private stopFlag = { value: false };
  private readonly wasm: AshmaizeWasmService;
  private readonly challengeService: ChallengeService;

  constructor(addresses: string[], wasm: AshmaizeWasmService, challengeService: ChallengeService) {
    this.allAddresses = [...addresses];
    this.wasm = wasm;
    this.challengeService = challengeService;
  }

  startNewChallenge(ch: Challenge, concurrency: number) {
    this.stopFlag.value = false;
    this.queue = [...this.allAddresses];
    this.completed.clear();
    return this.runPool(ch, concurrency);
  }

  stopCurrentChallenge() {
    this.stopFlag.value = true;
  }

  private async runPool(ch: Challenge, concurrency: number) {
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.workerLoop(i, ch));
    }
    await Promise.race([
      Promise.all(workers),
      this.monitorChallengeChange(ch),
    ]);
    this.stopCurrentChallenge();
  }

  private async monitorChallengeChange(ch: Challenge) {
    while (!this.stopFlag.value) {
      await new Promise(r => setTimeout(r, 2000));
      const current = this.challengeService.getCurrentChallenge();
      if (current.code !== 'active' || !current.challenge) continue;
      if (current.challenge.challenge_id !== ch.challenge_id) {
        return; // trigger stop
      }
    }
  }

  private nextAddress(): string | undefined {
    return this.queue.shift();
  }

  private shouldStop(): boolean {
    return this.stopFlag.value;
  }

  private async workerLoop(workerIndex: number, ch: Challenge) {
    let address = this.nextAddress();
    while (address && !this.shouldStop()) {
      const found = await this.mineWithAddress(workerIndex, address, ch, () => this.shouldStop());
      if (this.shouldStop()) break;
      if (found) {
        this.completed.add(address);
        address = this.nextAddress();
      } else {
        break;
      }
    }
  }

  private async mineWithAddress(workerIndex: number, address: string, ch: Challenge, stopSignal: () => boolean) {
    // independent nonce stream per worker+address
    let nonceBig = this.initialNonce(workerIndex, address);
    let attempts = 0;
    const start = Date.now();
    while (!stopSignal()) {
      const nonce = nonceBig.toString(16).padStart(16, '0').substring(0, 16);
      const preimageBytes = buildPreimageBytes(
        nonce,
        address,
        ch.challenge_id,
        ch.difficulty,
        ch.no_pre_mine,
        ch.latest_submission,
        ch.no_pre_mine_hour,
      );
      const ok = this.wasm.validateSolution(preimageBytes, ch.no_pre_mine, ch.difficulty);
      attempts++;
      if (ok) {
        const elapsed = (Date.now() - start) / 1000;
        const hps = attempts / Math.max(1e-9, elapsed);
        const hashHex = this.wasm.computeHash(preimageBytes, ch.no_pre_mine);
        console.log(`[W${workerIndex}] ✅ address=${address} nonce=${nonce} hash=${hashHex.substring(0,16)}... attempts=${attempts} speed=${hps.toFixed(1)} H/s`);
        return true;
      }
      nonceBig += 1n;
      if (attempts % 20000 === 0) {
        const elapsed = (Date.now() - start) / 1000;
        const hps = attempts / Math.max(1e-9, elapsed);
        console.log(`[W${workerIndex}] ⏳ address=${address} attempts=${attempts} speed=${hps.toFixed(1)} H/s`);
      }
    }
    return false;
  }

  private initialNonce(workerIndex: number, address: string): bigint {
    // derive a pseudo-random but stable seed per worker/address
    let seed = BigInt(0);
    for (let i = 0; i < address.length; i++) seed = (seed << 5n) + BigInt(address.charCodeAt(i));
    seed ^= BigInt(workerIndex + 1) * 0x9e3779b97f4a7c15n;
    return seed & 0xFFFFFFFFFFFFFFFFn;
  }
}

async function main() {
  const challengeService = new ChallengeService();
  const wasm = new AshmaizeWasmService();

  // configure your address pool and desired concurrency here
  const addresses: string[] = [
    'addr1qexample0001',
    'addr1qexample0002',
    'addr1qexample0003',
    'addr1qexample0004',
  ];
  const concurrency = Math.min(4, addresses.length);

  const current = challengeService.getCurrentChallenge();
  if (current.code !== 'active' || !current.challenge) {
    console.log('No active challenge.');
    return;
  }

  const ch = current.challenge as Challenge;
  const scheduler = new MinerScheduler(addresses, wasm, challengeService);
  console.log(`🚀 Starting mining: challenge=${ch.challenge_id} difficulty=${ch.difficulty}`);
  await scheduler.startNewChallenge(ch, concurrency);

  // If the challenge changes while running, we stop and start again automatically
  while (true) {
    const next = challengeService.getCurrentChallenge();
    if (next.code === 'active' && next.challenge && next.challenge.challenge_id !== ch.challenge_id) {
      const nextCh = next.challenge as Challenge;
      console.log(`🔁 Challenge changed → restarting miners for ${nextCh.challenge_id}`);
      await scheduler.startNewChallenge(nextCh, concurrency);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

main().catch(e => {
  console.error(e);
});


