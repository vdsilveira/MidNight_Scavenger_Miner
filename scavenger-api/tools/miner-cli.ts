/**
 * Ferramenta CLI para mineração Scavenger Mine com múltiplos endereços Cardano
 * 
 * Uso:
 *   npm run miner -- --register <address> <pubkey>
 *   npm run miner -- --mine <address>
 *   npm run miner -- --consolidate <original> <destination>
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

interface AddressConfig {
  address: string;
  pubkey: string;
  signature?: string;
  registered: boolean;
  solutions: number;
}

class ScavengerMiner {
  private configFile: string;
  private addresses: Map<string, AddressConfig>;

  constructor() {
    this.configFile = path.join(__dirname, '../miner-config.json');
    this.addresses = new Map();
    this.loadConfig();
  }

  private loadConfig() {
    if (fs.existsSync(this.configFile)) {
      const data = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      this.addresses = new Map(Object.entries(data));
    }
  }

  private saveConfig() {
    const data = Object.fromEntries(this.addresses);
    fs.writeFileSync(this.configFile, JSON.stringify(data, null, 2));
  }

  async registerAddress(address: string, pubkey: string, signature: string) {
    console.log(`📝 Registrando endereço: ${address.substring(0, 20)}...`);
    
    try {
      const response = await fetch(`${API_BASE}/register/${address}/${signature}/${pubkey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao registrar');
      }

      const data = await response.json();
      
      this.addresses.set(address, {
        address,
        pubkey,
        signature,
        registered: true,
        solutions: 0,
      });
      this.saveConfig();

      console.log(`✅ Endereço registrado com sucesso!`);
      console.log(`   Receipt: ${data.registrationReceipt.preimage.substring(0, 50)}...`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erro ao registrar: ${error.message}`);
      throw error;
    }
  }

  async getChallenge() {
    try {
      const response = await fetch(`${API_BASE}/challenge`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Erro ao buscar desafio: ${error.message}`);
      throw error;
    }
  }

  async submitSolution(address: string, challengeId: string, nonce: string) {
    console.log(`⛏️  Submetendo solução para ${address.substring(0, 20)}...`);
    
    try {
      const response = await fetch(
        `${API_BASE}/solution/${address}/${challengeId}/${nonce}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao submeter solução');
      }

      const data = await response.json();
      
      // Atualizar contador de soluções
      const config = this.addresses.get(address);
      if (config) {
        config.solutions++;
        this.saveConfig();
      }

      console.log(`✅ Solução aceita!`);
      console.log(`   Crypto Receipt: ${data.crypto_receipt.preimage.substring(0, 50)}...`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erro ao submeter solução: ${error.message}`);
      throw error;
    }
  }

  async consolidateAddresses(originalAddress: string, destinationAddress: string, signature: string) {
    console.log(`🔄 Consolidando ${originalAddress.substring(0, 20)}... -> ${destinationAddress.substring(0, 20)}...`);
    
    try {
      const response = await fetch(
        `${API_BASE}/donate_to/${destinationAddress}/${originalAddress}/${signature}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao consolidar');
      }

      const data = await response.json();
      
      console.log(`✅ Consolidação realizada!`);
      console.log(`   Soluções consolidadas: ${data.Solutions_consolidated}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erro ao consolidar: ${error.message}`);
      throw error;
    }
  }

  listAddresses() {
    console.log('\n📋 Endereços registrados:\n');
    
    if (this.addresses.size === 0) {
      console.log('   Nenhum endereço registrado ainda.');
      return;
    }

    let totalSolutions = 0;
    for (const [address, config] of this.addresses.entries()) {
      const status = config.registered ? '✅' : '⏳';
      console.log(`   ${status} ${address.substring(0, 30)}... (${config.solutions} soluções)`);
      totalSolutions += config.solutions;
    }
    
    console.log(`\n   Total de soluções: ${totalSolutions}`);
  }

  getRegisteredAddresses(): AddressConfig[] {
    return Array.from(this.addresses.values()).filter(addr => addr.registered);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const miner = new ScavengerMiner();

  if (args.length === 0) {
    console.log(`
🔧 Scavenger Mine CLI Tool

Uso:
  npm run miner -- --register <address> <pubkey> <signature>
  npm run miner -- --list
  npm run miner -- --challenge
  npm run miner -- --mine <address>
  npm run miner -- --consolidate <original> <destination> <signature>
    `);
    return;
  }

  const command = args[0];

  switch (command) {
    case '--register':
      if (args.length < 4) {
        console.error('❌ Uso: --register <address> <pubkey> <signature>');
        process.exit(1);
      }
      await miner.registerAddress(args[1], args[2], args[3]);
      break;

    case '--list':
      miner.listAddresses();
      break;

    case '--challenge':
      const challenge = await miner.getChallenge();
      console.log('\n🎯 Desafio Atual:\n');
      console.log(JSON.stringify(challenge, null, 2));
      break;

    case '--mine':
      if (args.length < 2) {
        console.error('❌ Uso: --mine <address>');
        process.exit(1);
      }
      console.log('⛏️  Mineração manual - use o miner completo para mineração automatizada');
      const challenge2 = await miner.getChallenge();
      console.log(`Desafio: ${challenge2.challenge?.challenge_id}`);
      break;

    case '--consolidate':
      if (args.length < 4) {
        console.error('❌ Uso: --consolidate <original> <destination> <signature>');
        process.exit(1);
      }
      await miner.consolidateAddresses(args[1], args[2], args[3]);
      break;

    default:
      console.error(`❌ Comando desconhecido: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ScavengerMiner };

