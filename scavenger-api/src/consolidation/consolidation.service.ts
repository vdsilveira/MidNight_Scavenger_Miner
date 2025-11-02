import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { DonateService } from '../donate/donate.service';
import { CardanoDerivationService } from '../cardano-derivation/cardano-derivation.service';

@Injectable()
export class ConsolidationService {
  private readonly logger = new Logger(ConsolidationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly donateService: DonateService,
    private readonly cardanoDerivation: CardanoDerivationService,
  ) {}

  /**
   * Consolida todas as soluções de endereços derivados para o endereço principal
   */
  async consolidateAllToMain(): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    const seedPhrase = this.configService.get<string>('SEED_PHRASE');
    if (!seedPhrase) {
      throw new Error('SEED_PHRASE não configurada');
    }

    // Obter endereço principal
    // Tentar usar o fornecido no .env, senão derivar
    let targetAddress = this.configService.get<string>('MAIN_ADDRESS');
    
    if (!targetAddress || !targetAddress.startsWith('addr1')) {
      // Se não fornecido ou inválido, derivar do index 0
      const mainAddress = await this.cardanoDerivation.deriveAddress(seedPhrase, 0, 0);
      targetAddress = mainAddress.address;
      this.logger.log(`Endereço principal derivado: ${targetAddress.substring(0, 20)}...`);
    } else {
      this.logger.log(`Usando endereço principal do .env: ${targetAddress.substring(0, 20)}...`);
    }

    this.logger.log(`🔄 Consolidando soluções para endereço principal: ${targetAddress.substring(0, 20)}...`);

    // Obter todos os endereços registrados
    // Por enquanto, vamos usar uma abordagem que itera sobre os endereços conhecidos
    // Em produção, isso viria do banco de dados
    const registeredAddresses: string[] = [];
    
    // Para encontrar endereços registrados, vamos derivar os primeiros 50
    // e verificar quais estão registrados
    const addressCount = parseInt(this.configService.get<string>('ADDRESS_COUNT', '50'));
    
    for (let i = 0; i < addressCount; i++) {
      try {
        // Cada endereço usa uma account diferente (i) e sempre index 0 do endereço
        const derived = await this.cardanoDerivation.deriveAddress(seedPhrase!, i, 0);
        if (this.storageService.isRegistered(derived.address)) {
          registeredAddresses.push(derived.address);
        }
      } catch (error) {
        // Continua
      }
    }
    
    let success = 0;
    let failed = 0;

    // Para cada endereço registrado (exceto o principal)
    for (const address of registeredAddresses) {
      if (address === targetAddress) {
        continue; // Pular o próprio endereço principal
      }

      try {
        // Criar mensagem de doação
        const message = `Assign accumulated Scavenger rights to: ${targetAddress}`;
        
        // Assinar mensagem com o endereço original
        // Encontrar o índice do endereço
        const addressIndex = await this.findAddressIndex(seedPhrase, address);
        
        if (addressIndex === null) {
          this.logger.warn(`Não foi possível encontrar índice para ${address.substring(0, 20)}...`);
          failed++;
          continue;
        }

        const signature = await this.cardanoDerivation.signMessage(
          message,
          seedPhrase,
          0,
          addressIndex,
        );

        // Executar consolidação
        await this.donateService.donate(targetAddress, address, signature);
        
        this.logger.log(`✅ Consolidação bem-sucedida: ${address.substring(0, 20)}... -> ${targetAddress.substring(0, 20)}...`);
        success++;
        
        // Delay para não sobrecarregar
        await this.delay(500);
      } catch (error) {
        // Se já consolidado ou erro, apenas logar
        if (error.message?.includes('already has an active donation')) {
          this.logger.log(`⚠️  ${address.substring(0, 20)}... já consolidado`);
          success++;
        } else {
          this.logger.error(`❌ Erro ao consolidar ${address.substring(0, 20)}...: ${error.message}`);
          failed++;
        }
      }
    }

    const total = success + failed;

    return {
      success,
      failed,
      total,
    };
  }

  private async findAddressIndex(seedPhrase: string, targetAddress: string): Promise<number | null> {
    return await this.cardanoDerivation.findAddressIndex(seedPhrase, targetAddress, 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

