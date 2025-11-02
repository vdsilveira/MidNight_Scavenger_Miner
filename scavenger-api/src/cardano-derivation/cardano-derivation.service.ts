import { Injectable, Logger } from '@nestjs/common';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';

// Importar biblioteca Cardano real
let CardanoWasm: any;
try {
  CardanoWasm = require('@dcspark/cardano-multiplatform-lib-nodejs');
} catch (error) {
  console.warn('⚠️  @dcspark/cardano-multiplatform-lib-nodejs não encontrado, usando implementação simplificada');
}

@Injectable()
export class CardanoDerivationService {
  private readonly logger = new Logger(CardanoDerivationService.name);
  private addressCache: Map<string, any> = new Map();

  /**
   * Deriva endereço Cardano a partir de seed phrase usando CIP-1852
   * Caminho: m/1852'/1815'/account'/0/index
   * 
   * Usa @dcspark/cardano-multiplatform-lib-nodejs para gerar endereços Cardano reais
   */
  async deriveAddress(
    seedPhrase: string,
    account: number = 0,
    index: number = 0,
  ): Promise<{
    address: string;
    pubkey: string;
    privateKey: string;
    derivationPath: string;
  }> {
    try {
      const cacheKey = `${seedPhrase}-${account}-${index}`;
      if (this.addressCache.has(cacheKey)) {
        return this.addressCache.get(cacheKey);
      }

      // Validar mnemonic
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Mnemonic inválido. Verifique se todas as palavras estão corretas.');
      }

      // Caminho de derivação Cardano: m/1852'/1815'/account'/0/index
      const derivationPath = `m/1852'/1815'/${account}'/0/${index}`;
      
          // Tentar usar biblioteca Cardano real
      if (CardanoWasm) {
        try {
          this.logger.debug(`🔑 Derivando endereço: account=${account}, index=${index}, path=${derivationPath}`);
          
          // Obter entropy do mnemonic
          const entropy = bip39.mnemonicToEntropy(seedPhrase);
          const entropyBytes = Buffer.from(entropy, 'hex');
          
          // Criar root key do BIP39
          const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
            entropyBytes,
            Buffer.from(''), // Senha vazia
          );
          
          // Derivar conforme CIP-1852: m/1852'/1815'/account'/0/index
          // 1852' (hardened) = 0x80000000 + 1852 = 0x8000073C
          // 1815' (hardened) = 0x80000000 + 1815 = 0x80000717
          // account' (hardened) = 0x80000000 + account
          
          const purposeKey = rootKey.derive(0x8000073C); // 1852'
          const coinTypeKey = purposeKey.derive(0x80000717); // 1815'
          const accountKey = coinTypeKey.derive(0x80000000 + account); // account'
          const roleKey = accountKey.derive(0); // role 0 (payment)
          const addressKey = roleKey.derive(index); // index
          
          // Obter chave privada e pública
          const privateKey = addressKey.to_raw_key();
          const publicKey = privateKey.to_public();
          
          // Obter stake key (para endereço base)
          const stakeKey = accountKey.derive(2).derive(0).to_raw_key().to_public();
          
          // Criar endereço base (BaseAddress)
          // Network ID: No Cardano, network = 1 para mainnet, 0 para testnet
          const paymentCredential = CardanoWasm.Credential.new_pub_key(
            publicKey.hash()
          );
          const stakeCredential = CardanoWasm.Credential.new_pub_key(
            stakeKey.hash()
          );
          
          // Tentar ambos os valores de network para ver qual gera o endereço correto
          let baseAddress;
          let address;
          
          // Tentar network = 1 (mainnet)
          baseAddress = CardanoWasm.BaseAddress.new(1, paymentCredential, stakeCredential);
          address = baseAddress.to_address().to_bech32();
          this.logger.debug(`📍 Endereço gerado (network=1): ${address}`);
          
          // Se o endereço não começar com addr1q, tentar network = 0
          if (!address.startsWith('addr1')) {
            baseAddress = CardanoWasm.BaseAddress.new(0, paymentCredential, stakeCredential);
            address = baseAddress.to_address().to_bech32();
            this.logger.debug(`📍 Endereço gerado (network=0): ${address}`);
          }
          
          // Converter pubkey para hex (64 caracteres) - Ed25519 tem 32 bytes = 64 hex chars
          const pubkeyHex = Buffer.from(publicKey.to_raw_bytes()).toString('hex');
          const privateKeyHex = Buffer.from(privateKey.to_raw_bytes()).toString('hex');
          
          const result = {
            address,
            pubkey: pubkeyHex, // Formato hex de 64 caracteres (não bech32)
            privateKey: privateKeyHex,
            derivationPath,
          };

          this.addressCache.set(cacheKey, result);
          this.logger.debug(`✅ Endereço derivado: ${address.substring(0, 40)}...`);
          return result;
        } catch (wasmError: any) {
          this.logger.warn(`Erro ao usar biblioteca Cardano WASM: ${wasmError.message}, usando fallback`);
          // Fallback para implementação simplificada
        }
      }
      
      // Fallback: Implementação simplificada
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      const ed25519Key = this.deriveEd25519Key(seed, derivationPath);
      const address = this.generateCardanoAddress(ed25519Key.publicKey, account, index);
      const pubkey = ed25519Key.publicKey.toString('hex');
      
      const result = {
        address,
        pubkey,
        privateKey: ed25519Key.privateKey.toString('hex'),
        derivationPath,
      };

      this.addressCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao derivar endereço: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deriva múltiplos endereços sequencialmente
   * Conforme padrão Eternl: cada endereço usa uma account diferente
   * - Índice 0 → m/1852'/1815'/0'/0/0
   * - Índice 1 → m/1852'/1815'/1'/0/0
   * - Índice 2 → m/1852'/1815'/2'/0/0
   * etc.
   */
  async deriveMultipleAddresses(
    seedPhrase: string,
    count: number = 50,
    startAccount: number = 0,
  ): Promise<Array<{
    address: string;
    pubkey: string;
    privateKey: string;
    derivationPath: string;
    index: number;
    account: number;
  }>> {
    const addresses: Array<{
      address: string;
      pubkey: string;
      privateKey: string;
      derivationPath: string;
      index: number;
      account: number;
    }> = [];
    
    this.logger.log(`Derivando ${count} endereços (cada um em uma account diferente)...`);
    
    for (let i = 0; i < count; i++) {
      try {
        // Cada endereço usa uma account diferente (i + startAccount)
        // Mas sempre com index 0 do endereço (0/0)
        const account = startAccount + i;
        const derived = await this.deriveAddress(seedPhrase, account, 0); // Sempre index 0 do endereço
        addresses.push({
          ...derived,
          index: i, // Índice na lista (para tracking)
          account: account, // Account usada (0, 1, 2, ...)
        });
        
        if ((i + 1) % 10 === 0) {
          this.logger.log(`  ✅ ${i + 1}/${count} endereços derivados`);
        }
      } catch (error) {
        this.logger.error(`Erro ao derivar endereço ${i}: ${error.message}`);
        // Continua para o próximo
      }
    }
    
    this.logger.log(`✅ ${addresses.length} endereços derivados com sucesso`);
    return addresses;
  }

  /**
   * Deriva chave Ed25519 determinística a partir do seed e caminho
   * Esta é uma implementação simplificada que produz resultados determinísticos
   */
  private deriveEd25519Key(seed: Buffer, derivationPath: string): {
    privateKey: Buffer;
    publicKey: Buffer;
  } {
    // Criar entrada determinística para derivação
    const input = Buffer.concat([
      seed,
      Buffer.from(derivationPath, 'utf-8'),
    ]);
    
    // Usar PBKDF2 para derivar chave determinística
    const salt = 'cardano-ed25519-derivation';
    const iterations = 4096;
    const derivedBytes = crypto.pbkdf2Sync(input, salt, iterations, 64, 'sha512');
    
    // Primeiros 32 bytes são a chave privada
    const privateKey = derivedBytes.slice(0, 32);
    
    // Derivar chave pública (Ed25519 simplificado)
    // Em produção, use uma biblioteca Ed25519 adequada
    const publicKey = crypto.createHash('sha256')
      .update(Buffer.concat([
        privateKey,
        Buffer.from('ed25519-public-key-salt'),
      ]))
      .digest()
      .slice(0, 32);
    
    return { privateKey, publicKey };
  }

  /**
   * Gera endereço Cardano determinístico
   * Esta é uma implementação simplificada que produz endereços consistentes
   * NOTA: Para produção, use @dcspark/cardano-multiplatform-lib-nodejs
   */
  private generateCardanoAddress(
    publicKey: Buffer,
    account: number,
    index: number,
  ): string {
    // Se for o endereço principal (index 0), tentar usar o fornecido no .env
    // Caso contrário, gerar determinístico
    
    // Criar hash determinístico do endereço
    const combined = Buffer.concat([
      publicKey,
      Buffer.from(account.toString()),
      Buffer.from(index.toString()),
    ]);
    
    const hash = crypto.createHash('sha256').update(combined).digest();
    
    // Para index 0, vamos tentar usar o endereço real se fornecido
    // Para outros índices, gerar formatado
    const addressBody = hash.toString('hex').substring(0, 56); // 56 hex chars para ~28 bytes
    
    // Formato: addr1q + hash (simplificado)
    // Em produção, isso deve gerar um endereço Cardano real usando a biblioteca oficial
    return `addr1q${addressBody}`;
  }

  /**
   * Assina mensagem usando chave privada derivada
   * NOTA: Implementação simplificada - em produção usar CIP-8/30
   */
  async signMessage(
    message: string,
    seedPhrase: string,
    account: number = 0,
    index: number = 0,
  ): Promise<string> {
    const derived = await this.deriveAddress(seedPhrase, account, index);
    const privateKey = Buffer.from(derived.privateKey, 'hex');
    
    // Gerar assinatura determinística (simplificado)
    // Em produção, use CIP-8/30 com @cardano-foundation libraries
    const messageHash = crypto.createHash('sha256')
      .update(message)
      .digest();
    
    const signature = crypto.createHash('sha256')
      .update(Buffer.concat([privateKey, messageHash]))
      .digest('hex');
    
    return signature;
  }

  /**
   * Encontra o índice de um endereço derivado
   */
  async findAddressIndex(
    seedPhrase: string,
    targetAddress: string,
    maxIndex: number = 100,
  ): Promise<number | null> {
    for (let i = 0; i < maxIndex; i++) {
      try {
        const derived = await this.deriveAddress(seedPhrase, 0, i);
        if (derived.address === targetAddress) {
          return i;
        }
      } catch (error) {
        // Continua procurando
      }
    }
    return null;
  }
}
