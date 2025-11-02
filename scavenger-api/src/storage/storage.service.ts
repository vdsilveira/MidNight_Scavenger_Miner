import { Injectable } from '@nestjs/common';

export interface RegisteredAddress {
  address: string;
  pubkey: string;
  signature: string;
  registeredAt: Date;
}

export interface SubmittedSolution {
  address: string;
  challengeId: string;
  nonce: string;
  preimage: string;
  timestamp: Date;
}

export interface Donation {
  donationId: string;
  originalAddress: string;
  destinationAddress: string;
  createdAt: Date;
}

@Injectable()
export class StorageService {
  private registeredAddresses: Map<string, RegisteredAddress> = new Map();
  private solutions: Map<string, SubmittedSolution[]> = new Map(); // address -> solutions
  private donations: Map<string, Donation> = new Map(); // originalAddress -> donation

  registerAddress(
    address: string,
    pubkey: string,
    signature: string,
  ): void {
    if (this.registeredAddresses.has(address)) {
      throw new Error('Address already registered');
    }

    this.registeredAddresses.set(address, {
      address,
      pubkey,
      signature,
      registeredAt: new Date(),
    });
  }

  isRegistered(address: string): boolean {
    return this.registeredAddresses.has(address);
  }

  getPubkey(address: string): string | undefined {
    return this.registeredAddresses.get(address)?.pubkey;
  }

  /**
   * Obtém todos os endereços registrados (com suas informações)
   */
  getAllRegisteredAddresses(): Map<string, RegisteredAddress> {
    return this.registeredAddresses;
  }

  addSolution(
    address: string,
    challengeId: string,
    nonce: string,
    preimage: string,
  ): void {
    const solutions = this.solutions.get(address) || [];
    solutions.push({
      address,
      challengeId,
      nonce,
      preimage,
      timestamp: new Date(),
    });
    this.solutions.set(address, solutions);
  }

  getSolutionsForAddress(address: string): SubmittedSolution[] {
    return this.solutions.get(address) || [];
  }

  /**
   * Obtém uma solução específica para um endereço e desafio
   */
  getSolution(address: string, challengeId: string): SubmittedSolution | undefined {
    const solutions = this.solutions.get(address) || [];
    return solutions.find(s => s.challengeId === challengeId);
  }

  getAllSolutions(): Map<string, SubmittedSolution[]> {
    return this.solutions;
  }

  createDonation(
    originalAddress: string,
    destinationAddress: string,
    donationId: string,
  ): void {
    // Verificar se já existe uma doação ativa
    const existing = this.donations.get(originalAddress);
    if (existing && existing.destinationAddress !== destinationAddress) {
      throw new Error('Address already has an active donation assignment');
    }

    this.donations.set(originalAddress, {
      donationId,
      originalAddress,
      destinationAddress,
      createdAt: new Date(),
    });
  }

  getDonation(originalAddress: string): Donation | undefined {
    return this.donations.get(originalAddress);
  }

  getDestinationAddress(address: string): string {
    // Se o endereço tem uma doação, retorna o endereço de destino
    const donation = this.donations.get(address);
    if (donation) {
      // Verificar se o endereço de destino também tem uma doação (consolidar)
      const destDonation = this.donations.get(donation.destinationAddress);
      if (destDonation) {
        return destDonation.destinationAddress;
      }
      return donation.destinationAddress;
    }
    return address;
  }

  getConsolidatedSolutionsCount(address: string): number {
    const destination = this.getDestinationAddress(address);
    let count = 0;

    // Contar soluções do endereço de destino consolidado
    for (const [addr, solutions] of this.solutions.entries()) {
      const addrDest = this.getDestinationAddress(addr);
      if (addrDest === destination) {
        count += solutions.length;
      }
    }

    return count;
  }

  getSolutionsByDestination(destinationAddress: string): SubmittedSolution[] {
    const allSolutions: SubmittedSolution[] = [];
    
    for (const [addr, solutions] of this.solutions.entries()) {
      const addrDest = this.getDestinationAddress(addr);
      if (addrDest === destinationAddress) {
        allSolutions.push(...solutions);
      }
    }

    return allSolutions;
  }

  /**
   * Obtém todas as soluções para um challenge específico
   */
  getSolutionsByChallenge(challengeId: string): SubmittedSolution[] {
    const allSolutions: SubmittedSolution[] = [];
    
    for (const [address, solutions] of this.solutions.entries()) {
      const challengeSolutions = solutions.filter(s => s.challengeId === challengeId);
      allSolutions.push(...challengeSolutions);
    }

    // Ordenar por timestamp (mais recente primeiro)
    allSolutions.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    return allSolutions;
  }

  /**
   * Verifica se um challenge específico tem soluções submetidas
   */
  hasSolutionsForChallenge(challengeId: string): boolean {
    for (const [_, solutions] of this.solutions.entries()) {
      if (solutions.some(s => s.challengeId === challengeId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Conta quantas soluções foram submetidas para um challenge
   */
  countSolutionsForChallenge(challengeId: string): number {
    let count = 0;
    for (const [_, solutions] of this.solutions.entries()) {
      count += solutions.filter(s => s.challengeId === challengeId).length;
    }
    return count;
  }

  /**
   * Obtém endereços que submeteram solução para um challenge
   */
  getAddressesWithSolutionForChallenge(challengeId: string): string[] {
    const addresses = new Set<string>();
    
    for (const [address, solutions] of this.solutions.entries()) {
      if (solutions.some(s => s.challengeId === challengeId)) {
        addresses.add(address);
      }
    }

    return Array.from(addresses);
  }
}

