import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import axios from 'axios';

interface ChallengeData {
  challenge_id: string;
  difficulty: string;
  no_pre_mine: string;
  no_pre_mine_hour: string;
  latest_submission: string;
}

interface ChallengeResponse {
  code: string;
  challenge: ChallengeData;
}

const API_BASE = 'https://scavenger.prod.gd.midnighttge.io';
const TEST_ADDRESS = 'addr1qxpa4gx6ctqcgwwd4pfq8zjrwxvp9qhegtcjvyqcw5tnxpqszphkzr6wjywxtq8l7ls0qa2dl8ca5h89h8pdvvyr5rqq8c3d9';

async function getCurrentChallenge(): Promise<ChallengeData> {
  console.log('📡 Obtendo challenge atual da API...');
  console.log('🌐 Usando API:', API_BASE);
  
  console.log('Fazendo requisição GET para:', `${API_BASE}/challenge`);
  const response = await axios.get<ChallengeResponse>(`${API_BASE}/challenge`);
  console.log('Resposta recebida:', response.data);
  
  const challenge = response.data.challenge;
  console.log('Challenge extraído:', challenge);
  
  return challenge;
}

function logChallengeInfo(challenge: ChallengeData): void {
  console.log('📊 Challenge Info:');
  console.log('Challenge ID:', challenge.challenge_id);
  console.log('Difficulty:', challenge.difficulty);
  console.log('No pre mine:', challenge.no_pre_mine.substring(0, 16) + '...');
  console.log('Latest submission:', challenge.latest_submission);
  console.log();
}

function buildBasePreimage(challenge: ChallengeData, address: string): string {
  return `${address}${challenge.challenge_id}${challenge.difficulty}${challenge.no_pre_mine}${challenge.latest_submission}${challenge.no_pre_mine_hour}`;
}

interface MiningResult {
  nonce: string;
  hash: string;
  miningTimeSeconds: number;
}

async function mineChallenge(
  ashmaizeService: AshmaizeWasmService,
  challenge: ChallengeData,
  basePreimage: string
): Promise<MiningResult> {
  console.log('⛏️  Iniciando mineração com padrões de bits...');
  console.log('🎯 Dificuldade alvo:', challenge.difficulty);
  console.log('📝 Base preimage:', basePreimage);
  const startTime = Date.now();
  
  let bestResult: { nonce: string; hash: string } | null = null;
  const MAX_ATTEMPTS = 1000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔨 Tentativa ${attempt}/${MAX_ATTEMPTS}`);
    
    // Testar o nonce ffff0000
    const testNonce = 'ffff0000' + '0'.repeat(8); // Completando para 16 caracteres
    const result = { 
      nonce: testNonce,
      hash: ashmaizeService.computeHash(testNonce + basePreimage, challenge.no_pre_mine)
    };

    console.log(`📊 Hash gerado: ${result.hash.substring(0, 16)}...`);
    console.log(`🎲 Nonce usado: ${result.nonce}`);

    // Se encontrou uma solução válida, retorna imediatamente
    if (ashmaizeService.validateSolution(
      result.nonce + basePreimage,
      challenge.no_pre_mine,
      challenge.difficulty
    )) {
      console.log(`✅ Solução válida encontrada na tentativa ${attempt}!`);
      console.log('🏆 Hash completo:', result.hash);
      console.log('🎯 Comparando com dificuldade:', challenge.difficulty);
      const miningTimeSeconds = (Date.now() - startTime) / 1000;
      return { nonce: result.nonce, hash: result.hash, miningTimeSeconds };
    } else {
      console.log('❌ Hash não atende à dificuldade requerida');
    }

    // Guarda o melhor resultado até agora (mais próximo da dificuldade)
    if (!bestResult || result.hash < bestResult.hash) {
      bestResult = result;
      console.log('📈 Novo melhor hash encontrado!');
    }

    if (attempt % 10 === 0) {
      const timeSpent = (Date.now() - startTime) / 1000;
      console.log(`\n� Status após ${attempt} tentativas:`);
      console.log(`⏱️  Tempo decorrido: ${timeSpent.toFixed(2)}s`);
      console.log(`🏆 Melhor hash até agora: ${bestResult.hash.substring(0, 16)}...`);
      console.log(`🎲 Melhor nonce até agora: ${bestResult.nonce}`);
      console.log(`📈 Taxa de hash: ${(attempt / timeSpent).toFixed(2)} hashes/s`);
    }
  }

  const miningTimeSeconds = (Date.now() - startTime) / 1000;
  return {
    nonce: bestResult!.nonce,
    hash: bestResult!.hash,
    miningTimeSeconds
  };
}

function validateSolution(
  ashmaizeService: AshmaizeWasmService,
  nonce: string,
  basePreimage: string,
  challenge: ChallengeData
): boolean {
  return ashmaizeService.validateSolution(
    nonce + basePreimage,
    challenge.no_pre_mine,
    challenge.difficulty
  );
}

/**
 * Deriva variantes de nonce deslocando 16 bits (2 bytes).
 * Recebe um nonce em hex (16 chars) e retorna array de variantes hex-padded (16 chars).
 */
function deriveNonce16Variants(nonceHex: string): string[] {
  // interpreta como BigInt (assume hex) e aplica shifts/rotations sobre 64-bit space
  const mask64 = (BigInt(1) << BigInt(64)) - BigInt(1);
  let n = BigInt('0x' + nonceHex);

  const left16 = ((n << BigInt(16)) & mask64);
  const right16 = (n >> BigInt(16)) & mask64;

  // rotate left 16
  const rotateLeft16 = ((n << BigInt(16)) & mask64) | (n >> BigInt(64 - 16));

  const format = (b: BigInt) => b.toString(16).padStart(16, '0');
  return [format(left16), format(right16), format(rotateLeft16)];
}

function logMiningResults(
  result: MiningResult,
  isValid: boolean,
  challenge: ChallengeData
): void {
  console.log(`\n⏱️  Tempo de mineração: ${result.miningTimeSeconds.toFixed(2)}s`);
  console.log('\n📊 Resultados:');
  console.log('Nonce encontrado:', result.nonce);
  console.log('Hash completo:', result.hash);
  console.log('Hash válido localmente?', isValid ? '✅ Sim' : '❌ Não');
  console.log('Primeiros 8 bytes:', result.hash.substring(0, 8));
  console.log('Dificuldade alvo:', challenge.difficulty);
}

interface SolutionResponse {
  crypto_receipt?: string;
  message?: string;
  status?: string;
}

async function submitSolution(
  nonce: string,
  address: string,
  challenge: ChallengeData
): Promise<SolutionResponse> {
  console.log('\n📡 Submetendo solução para a API...');
  const response = await axios.post<SolutionResponse>(
    `${API_BASE}/solution/${address}/${challenge.challenge_id}/${nonce}`,
    {}
  );
  return response.data;
}

function logSubmissionResult(
  response: SolutionResponse,
  challenge: ChallengeData,
  nonce: string,
  address: string,
  hash: string,
  basePreimage: string
): void {
  if (response.crypto_receipt) {
    console.log('\n🎉 SUCESSO! Solução aceita pela Midnight!');
    console.log('Recibo criptográfico:', response.crypto_receipt);
  } else {
    console.log('\n📬 Resposta da API:', response);
    console.log('\n🔍 Detalhes da submissão:');
    console.log('Challenge ID:', challenge.challenge_id);
    console.log('Nonce:', nonce);
    console.log('Address:', address);
    console.log('Hash calculado:', hash);
    console.log('Preimage completo:', nonce + basePreimage);
  }
}

async function testMiningAndSubmit() {
  try {
    console.log('🚀 Testando mineração otimizada e submissão...\n');

    const ashmaizeService = new AshmaizeWasmService();
    const challenge = await getCurrentChallenge();
    
    logChallengeInfo(challenge);
    
    const basePreimage = buildBasePreimage(challenge, TEST_ADDRESS);
    const miningResult = await mineChallenge(ashmaizeService, challenge, basePreimage);
    
    const isValid = validateSolution(
      ashmaizeService,
      miningResult.nonce,
      basePreimage,
      challenge
    );
    
    logMiningResults(miningResult, isValid, challenge);

    if (!isValid) {
      console.log('\n❌ Solução não atende à dificuldade requerida.');
      // Antes de abortar, testar variantes do nonce deslocadas em 16 bits
      console.log('\n🔎 Testando variantes do nonce deslocando 16 bits (left/right/rotate)...');
      const variants = deriveNonce16Variants(miningResult.nonce);
      let anyValid = false;
      for (const v of variants) {
        const valid = validateSolution(ashmaizeService, v, basePreimage, challenge);
        console.log(`Variant nonce ${v} -> valid locally? ${valid ? '✅ Sim' : '❌ Não'}`);
        if (valid) {
          anyValid = true;
        }
      }

      if (!anyValid) return;
    }

    try {
      const response = await submitSolution(miningResult.nonce, TEST_ADDRESS, challenge);
      logSubmissionResult(
        response,
        challenge,
        miningResult.nonce,
        TEST_ADDRESS,
        miningResult.hash,
        basePreimage
      );
    } catch (error: any) {
      console.error('\n❌ Erro ao submeter solução:', error.response?.data || error.message);
    }
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Dados:', error.response.data);
    }
    throw error;
  }
}

testMiningAndSubmit().catch(console.error);