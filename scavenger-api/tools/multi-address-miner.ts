/**
 * Minerador com suporte a múltiplos endereços Cardano
 * 
 * Este minerador permite:
 * - Registrar múltiplos endereços
 * - Minerar em paralelo com vários endereços
 * - Consolidar soluções em um único endereço
 */

import { ScavengerMiner } from './miner-cli';
import * as crypto from 'crypto';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

interface MiningConfig {
  addresses: string[];
  targetAddress?: string; // Endereço para consolidar soluções
  workers: number; // Número de workers por endereço
}

class MultiAddressMiner {
  private miner: ScavengerMiner;
  private isMining: boolean = false;

  constructor() {
    this.miner = new ScavengerMiner();
  }

  /**
   * Inicia mineração com múltiplos endereços
   */
  async startMining(config: MiningConfig) {
    if (this.isMining) {
      console.log('⚠️  Mineração já está em andamento');
      return;
    }

    this.isMining = true;
    console.log(`🚀 Iniciando mineração com ${config.addresses.length} endereço(s)...`);

    // Verificar se endereços estão registrados
    const registered = this.miner.getRegisteredAddresses();
    const registeredAddrs = new Set(registered.map(r => r.address));

    for (const address of config.addresses) {
      if (!registeredAddrs.has(address)) {
        console.error(`❌ Endereço não registrado: ${address.substring(0, 20)}...`);
        console.error('   Use: npm run miner -- --register <address> <pubkey> <signature>');
        this.isMining = false;
        return;
      }
    }

    // Obter desafio atual
    const challenge = await this.miner.getChallenge();
    
    if (challenge.code !== 'active') {
      console.error(`❌ Mineração não está ativa. Status: ${challenge.code}`);
      this.isMining = false;
      return;
    }

    console.log(`\n🎯 Desafio: ${challenge.challenge?.challenge_id}`);
    console.log(`   Dificuldade: ${challenge.challenge?.difficulty}`);
    console.log(`   Prazo: ${challenge.challenge?.latest_submission}\n`);

    // Iniciar workers para cada endereço
    const promises = config.addresses.map(address =>
      this.mineForAddress(address, challenge, config.workers)
    );

    await Promise.all(promises);
  }

  /**
   * Minera para um endereço específico
   */
  private async mineForAddress(
    address: string,
    challenge: any,
    numWorkers: number
  ) {
    if (!challenge.challenge) return;

    const challengeId = challenge.challenge.challenge_id;
    const difficulty = challenge.challenge.difficulty;
    const noPreMine = challenge.challenge.no_pre_mine;
    const latestSubmission = challenge.challenge.latest_submission;
    const noPreMineHour = challenge.challenge.no_pre_mine_hour;

    console.log(`⛏️  Iniciando ${numWorkers} worker(s) para ${address.substring(0, 20)}...`);

    // Criar workers paralelos
    const workers = Array(numWorkers).fill(null).map((_, i) =>
      this.worker(address, challengeId, difficulty, noPreMine, latestSubmission, noPreMineHour, i)
    );

    // Aguardar primeiro worker encontrar solução
    await Promise.race(workers);

    // Parar outros workers
    this.isMining = false;
  }

  /**
   * Worker de mineração (busca nonce válido)
   */
  private async worker(
    address: string,
    challengeId: string,
    difficulty: string,
    noPreMine: string,
    latestSubmission: string,
    noPreMineHour: string,
    workerId: number
  ): Promise<void> {
    let nonce = BigInt(workerId);
    const increment = BigInt(1);
    let attempts = 0;

    while (this.isMining) {
      // Verificar prazo
      if (new Date() > new Date(latestSubmission)) {
        console.log(`⏰ Prazo expirado para worker ${workerId}`);
        return;
      }

      // Construir preimage
      const nonceHex = nonce.toString(16).padStart(16, '0');
      const preimage = `${nonceHex}${address}${challengeId}${difficulty}${noPreMine}${latestSubmission}${noPreMineHour}`;

      // TODO: Calcular hash AshMaize real
      // Por enquanto, apenas incrementar nonce
      // Em produção, usar AshMaize real para calcular hash
      
      attempts++;
      if (attempts % 10000 === 0) {
        process.stdout.write(`\r   Worker ${workerId}: ${attempts.toLocaleString()} tentativas...`);
      }

      // TODO: Validar hash com dificuldade
      // Se válido, submeter solução
      // Por enquanto, apenas simulação

      nonce += increment;
      
      // Limite de segurança
      if (nonce > BigInt('0xFFFFFFFFFFFFFFFF')) {
        console.log(`\n⚠️  Worker ${workerId} atingiu limite de nonces`);
        return;
      }
    }
  }

  /**
   * Consolida soluções de múltiplos endereços para um endereço destino
   */
  async consolidateAll(targetAddress: string) {
    const registered = this.miner.getRegisteredAddresses();
    
    console.log(`\n🔄 Consolidando ${registered.length} endereço(s) para ${targetAddress.substring(0, 20)}...\n`);

    // Para cada endereço, criar mensagem de doação e assinar
    // NOTA: Você precisa assinar as mensagens com a carteira Cardano
    for (const addr of registered) {
      if (addr.address === targetAddress) continue;

      const message = `Assign accumulated Scavenger rights to: ${targetAddress}`;
      
      console.log(`   📝 ${addr.address.substring(0, 30)}...`);
      console.log(`      Mensagem para assinar: "${message}"`);
      console.log(`      Use sua carteira Cardano para assinar esta mensagem`);
      console.log(`      Depois execute:`);
      console.log(`      npm run miner -- --consolidate ${addr.address} ${targetAddress} <signature>\n`);
    }
  }
}

// Exemplo de uso
async function main() {
  const miner = new MultiAddressMiner();
  const args = process.argv.slice(2);

  if (args[0] === '--start') {
    // Exemplo de configuração
    const addresses = args.slice(1); // Passar endereços como argumentos
    
    if (addresses.length === 0) {
      console.error('❌ Especifique pelo menos um endereço');
      console.error('   Uso: npm run multi-miner -- --start <address1> <address2> ...');
      process.exit(1);
    }

    const config: MiningConfig = {
      addresses,
      workers: 2, // 2 workers por endereço
    };

    await miner.startMining(config);
  } else if (args[0] === '--consolidate-all') {
    const targetAddress = args[1];
    if (!targetAddress) {
      console.error('❌ Especifique o endereço destino');
      console.error('   Uso: npm run multi-miner -- --consolidate-all <target_address>');
      process.exit(1);
    }
    await miner.consolidateAll(targetAddress);
  } else {
    console.log(`
🔧 Multi-Address Miner

Uso:
  npm run multi-miner -- --start <address1> <address2> ...
  npm run multi-miner -- --consolidate-all <target_address>

Exemplo:
  npm run multi-miner -- --start addr1... addr2... addr3...
  npm run multi-miner -- --consolidate-all addr1...
    `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MultiAddressMiner };

