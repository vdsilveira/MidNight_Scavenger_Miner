import { AutoMinerService } from './auto-miner.service';
import { ConfigService } from '@nestjs/config';
import { CardanoDerivationService } from '../cardano-derivation/cardano-derivation.service';
import { StorageService } from '../storage/storage.service';
import { RegisterService } from '../register/register.service';
import { ChallengeService } from '../challenge/challenge.service';
import { AshmaizeWasmService } from '../ashmaize/ashmaize-wasm.service';
import { SolutionService } from '../solution/solution.service';
import { TermsService } from '../terms/terms.service';

// === MOCKS ===

const configService = {
  get: (key: string, defaultValue?: string) => defaultValue ?? '',
} as unknown as ConfigService;

const cardanoDerivation = {
  deriveMultipleAddresses: async (seed: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({ address: `addr${i}`, index: i, account: 0 })),
  signMessage: async (message: string) => `signed-${message}`,
} as unknown as CardanoDerivationService;

const storageService = {
  getSolution: () => null,
} as unknown as StorageService;

const registerService = {
  register: async () => Promise.resolve(),
} as unknown as RegisterService;

const challengeService = {
  getCurrentChallenge: () => ({
    code: 'active',
    challenge: {
      challenge_id: 'test-challenge',
      no_pre_mine: 'nopre',
      difficulty: '0000ffff',
      latest_submission: new Date(Date.now() + 60000).toISOString(),
      no_pre_mine_hour: '10',
    },
  }),
} as unknown as ChallengeService;

// ✅ Mock WASM service — não tem WASM real aqui, só simulação
const ashmaizeService = {
  validateSolution: async () => false,
  computeHash: async () => '0000abcd',
} as unknown as AshmaizeWasmService;

const solutionService = {
  submitSolution: async () => Promise.resolve(),
} as unknown as SolutionService;

const termsService = {
  getTermsAndConditions: () => ({ message: 'Accept terms' }),
} as unknown as TermsService;

// === Instantiate miner ===
const miner = new AutoMinerService(
  configService,
  cardanoDerivation,
  storageService,
  registerService,
  challengeService,
  ashmaizeService,
  solutionService,
  termsService,
);

console.log('✅ AutoMinerService instanciado com sucesso');

// Run test
(async () => {
  await miner.startAutoMining('seed-phrase', 5);
  console.log(miner.getMiningStatus());
})();
