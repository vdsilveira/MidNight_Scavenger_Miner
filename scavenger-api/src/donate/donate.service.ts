import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { CardanoService } from '../cardano/cardano.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DonateService {
  constructor(
    private readonly storageService: StorageService,
    private readonly cardanoService: CardanoService,
  ) {}

  async donate(
    destinationAddress: string,
    originalAddress: string,
    signature: string,
  ) {
    // Verificar se o endereço original está registrado
    if (!this.storageService.isRegistered(originalAddress)) {
      throw new NotFoundException(
        `Original address ${originalAddress} is not registered`,
      );
    }

    // Verificar se o endereço de destino está registrado
    if (!this.storageService.isRegistered(destinationAddress)) {
      throw new NotFoundException(
        `Destination address ${destinationAddress} is not registered`,
      );
    }

    // Construir mensagem esperada
    const expectedMessage = `Assign accumulated Scavenger rights to: ${destinationAddress}`;

    // Validar assinatura
    const pubkey = this.storageService.getPubkey(originalAddress);
    if (!pubkey) {
      throw new HttpException(
        {
          message: 'Original address pubkey not found',
          error: 'Internal Server Error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      await this.cardanoService.verifySignature(
        expectedMessage,
        signature,
        pubkey,
        originalAddress,
      );
    } catch (error) {
      throw new HttpException(
        {
          message: `Invalid CIP-30 signature failed: ${error.message}. Expected signature over message: "${expectedMessage}"`,
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se é uma tentativa de doar para si mesmo (desfazer doação)
    const existingDonation = this.storageService.getDonation(originalAddress);
    const isSelfDonation = originalAddress === destinationAddress;
    
    if (isSelfDonation && existingDonation) {
      // Desfazer doação
      // Por enquanto, apenas retornamos sucesso (em produção, remover a doação)
      return {
        status: 'success',
        message: `Successfully undid donation assignment for ${originalAddress}`,
        Original_address: originalAddress,
        Destination_address: destinationAddress,
        timestamp: new Date().toISOString(),
        Solutions_consolidated: 0,
      };
    }

    // Criar doação
    let donationId: string;
    try {
      donationId = uuidv4();
      this.storageService.createDonation(
        originalAddress,
        destinationAddress,
        donationId,
      );
    } catch (error) {
      if (error.message.includes('already has an active donation')) {
        throw new HttpException(
          {
            message: `Original address ${originalAddress} already has an active donation assignment to ${destinationAddress}`,
            error: 'Conflict',
            statusCode: HttpStatus.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    // Contar soluções consolidadas
    const solutionsConsolidated =
      this.storageService.getConsolidatedSolutionsCount(originalAddress);

    return {
      status: 'success',
      message: `Successfully assigned accumulated Scavenger rights from ${originalAddress} to ${destinationAddress}`,
      donation_id: donationId,
      original_address: originalAddress,
      destination_address: destinationAddress,
      timestamp: new Date().toISOString(),
      Solutions_consolidated: solutionsConsolidated,
    };
  }
}

