// tools/verify-solution.ts
import 'ts-node/register';
import { ChallengeService } from '../src/challenge/challenge.service';
import { AshmaizeWasmService } from '../src/ashmaize/ashmaize-wasm.service';

(async () => {
  // Substitua estes valores com uma entrada "solved" do export do browser:
  const example = {
    challenge_id: '**D06C07',                 // do export (com **)
    nonce: '000af7d6d0d8dd9e',                // 16-char hex
    address: 'addr1q8zylq27r648tnz...',       // full address from export
    difficulty: '0000015F',                   // 8 hex chars
    no_pre_mine: 'ba6aabd44670c349... (64 hex)', // from API/export
    latest_submission: '2025-11-03T23:59:59.000Z',
    no_pre_mine_hour: '...'                   // as in the challenge
  };

  // Este serviço gera no_pre_mine se você não tiver ele no export; se o export já tem no_pre_mine, use-o
  const challengeSvc = new ChallengeService();
  const ashSvc = new AshmaizeWasmService();

  const challengeIdWithStars = example.challenge_id;
  const challengeIdWithoutStars = challengeIdWithStars.startsWith('**') ? challengeIdWithStars.slice(2) : challengeIdWithStars;

  // se você tiver o no_pre_mine no export, mantenha; senão, gere:
  const noPreMine = example.no_pre_mine || challengeSvc['generateNoPreMine'](challengeIdWithoutStars);

  const preimage = [
    example.nonce,
    example.address,
    challengeIdWithStars,
    example.difficulty,
    noPreMine,
    example.latest_submission,
    example.no_pre_mine_hour,
  ].join('');

  console.log('Preimage string (len):', preimage.length);
  console.log('Preimage (first 200 chars):', preimage.slice(0,200));

  // Calcular hash via o serviço wasm (mesma função que seu backend usa)
  const hashHex = ashSvc.computeHash(preimage, noPreMine);
  console.log('Computed hash:', hashHex);

  // Compare com hash do export (se houver)
  // Se export fornece hash completo, compare. Se só prefix, compare prefix:
  // console.log('Expected hash:', example.hash);

  // Checar dificuldade com a função do serviço
  const valid = (ashSvc as any)['checkDifficulty'] ? (ashSvc as any)['checkDifficulty'](hashHex, example.difficulty) : null;
  console.log('Meets difficulty (checkDifficulty):', valid);

  process.exit(0);
})();