import { AshmaizeWasmService } from '../src/ashmaize/ashmaize-wasm.service';

async function testRomWithCurrentChallenge() {
  const wasm = new AshmaizeWasmService();

  // ✅ Dados do challenge ativo
  const challenge = {
    challenge_id: '**D05C03',
    day: 5,
    challenge_number: 3,
    issued_at: '2025-11-03T02:00:00.000Z',
    latest_submission: '2025-11-04T01:59:59.000Z',
    difficulty: '00001FFF',
    no_pre_mine: '033849ee29371141f2a9e546d8f4c0e84cab90a95230ef39823e84dacfc57b9a',
    no_pre_mine_hour: '231801248'
  };

  try {
    console.log('🔨 Gerando ROM para challenge ativo...');
    const rom = (wasm as any).getOrCreateRom(challenge.no_pre_mine);

    console.log('✅ ROM criada com sucesso!');

    // ✅ Teste rápido: gerar hash de uma string qualquer
    const preimage = '**D05C03' + challenge.no_pre_mine + challenge.no_pre_mine_hour + 'teste123';
    const hash = rom.hash(Buffer.from(preimage, 'utf-8'), 8, 256);

    console.log('Hash de teste (hex, primeiros 64 chars):', Buffer.from(hash).toString('hex').substring(0, 64));

    // ✅ Verificar se atende à dificuldade
    const meetsDifficulty = (wasm as any).checkDifficulty(Buffer.from(hash).toString('hex'), challenge.difficulty);
    console.log('Atende à dificuldade?', meetsDifficulty);
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar ROM ou hash:', error.message);
  }
}

// Executa
testRomWithCurrentChallenge();
