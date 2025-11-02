import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { TermsService } from '../terms/terms.service';
import { CardanoService } from '../cardano/cardano.service';
import * as crypto from 'crypto';

@Injectable()
export class RegisterService {
  constructor(
    private readonly storageService: StorageService,
    private readonly termsService: TermsService,
    private readonly cardanoService: CardanoService,
  ) {}

  async register(address: string, signature: string, pubkey: string) {
    // Validar formato da pubkey (64 caracteres hex)
    if (!/^[0-9a-fA-F]{64}$/.test(pubkey)) {
      throw new HttpException(
        {
          message: 'Invalid pubkey format - must be 64-character hex string',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar endereço Cardano básico
    if (!this.isValidCardanoAddress(address)) {
      throw new HttpException(
        {
          message: 'Invalid Cardano address format',
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Obter mensagem dos termos
    const terms = this.termsService.getTermsAndConditions();
    const message = terms.message;

    // Validar assinatura CIP-8/30
    try {
      await this.cardanoService.verifySignature(message, signature, pubkey, address);
    } catch (error) {
      throw new HttpException(
        {
          message: `CIP-30 signature verification failed: ${error.message}`,
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Registrar endereço
    try {
      this.storageService.registerAddress(address, pubkey, signature);
    } catch (error) {
      if (error.message === 'Address already registered') {
        throw new HttpException(
          {
            message: 'Address already registered',
            error: 'Conflict',
            statusCode: HttpStatus.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    // Gerar receipt
    const timestamp = new Date();
    const preimage = `${address}${signature}${timestamp.toISOString()}`;
    const serverSignature = this.generateServerSignature(preimage);

    return {
      registrationReceipt: {
        preimage,
        signature: serverSignature,
        timestamp: timestamp.toISOString(),
      },
    };
  }

  private isValidCardanoAddress(address: string): boolean {
    // Validação básica de endereço Cardano
    return (
      address.startsWith('addr1') ||
      address.startsWith('addr_test1') ||
      address.startsWith('addr_')
    );
  }

  private generateServerSignature(preimage: string): string {
    // Gerar assinatura do servidor (simplificado - em produção usar chave privada real)
    const hash = crypto.createHash('sha256').update(preimage).digest('hex');
    return hash.substring(0, 64); // 64 caracteres hex
  }
}

