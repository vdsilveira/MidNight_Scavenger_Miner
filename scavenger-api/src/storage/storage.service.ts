import { Injectable } from '@nestjs/common';

export interface RegisteredAddress {
  address: string;
  pubkey: string;
  signature: string;
  registeredAt: Date;
  nightEarned: number; // Novo campo para rastrear NIGHTs
}

export interface SubmittedSolution {
  address: string;
  challengeId: string;
  nonce: string;
  preimage: string;
  timestamp: Date;
  nightEarned: number; // NIGHTs ganhos por esta solução
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
  private readonly NIGHT_PER_SOLUTION = 32.005; // Taxa fixa de NIGHTs por solução

  registerAddress(
    address: string,
    pubkey: string,
    signature: string,
  ): void {
    console.log(`📝 Registrando endereço ${address}`);
    
    if (this.registeredAddresses.has(address)) {
      console.warn(`⚠️ Endereço ${address} já registrado`);
      throw new Error('Address already registered');
    }

    this.registeredAddresses.set(address, {
      address,
      pubkey,
      signature,
      registeredAt: new Date(),
      nightEarned: 0, // Começa com 0 NIGHTs
    });
    
    console.log(`✅ Endereço ${address} registrado com sucesso`);
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
    console.log(`📝 Adicionando solução para endereço ${address}`);
    console.log(`Challenge ID: ${challengeId}`);
    console.log(`Nonce: ${nonce}`);
    
    const solutions = this.solutions.get(address) || [];
    const nightEarned = this.NIGHT_PER_SOLUTION;

    solutions.push({
      address,
      challengeId,
      nonce,
      preimage,
      timestamp: new Date(),
      nightEarned,
    });
    this.solutions.set(address, solutions);

    // Atualizar o total de NIGHTs da carteira
    const addressInfo = this.registeredAddresses.get(address);
    if (addressInfo) {
      addressInfo.nightEarned += nightEarned;
      this.registeredAddresses.set(address, addressInfo);
      console.log(`✅ NIGHTs atualizados: ${addressInfo.nightEarned} NIGHT para ${address}`);
    } else {
      console.warn(`⚠️ Endereço ${address} não registrado ao adicionar solução`);
    }
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
      const challengeSolutions = solutions.filter(
        (s) => s.challengeId === challengeId,
      );
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

  /**
   * Obtém o total de NIGHTs ganhos por um endereço
   */
  getNightEarned(address: string): number {
    const addressInfo = this.registeredAddresses.get(address);
    if (!addressInfo) return 0;
    return addressInfo.nightEarned;
  }

  /**
   * Obtém o total de NIGHTs ganhos por todas as carteiras
   */
  getTotalNightEarned(): number {
    let total = 0;
    
    for (const info of this.registeredAddresses.values()) {
      total += info.nightEarned;
    }
    
    return total;
  }

  /**
   * Obtém o total de NIGHTs ganhos consolidado por um endereço
   * (inclui NIGHTs de carteiras que doaram para este endereço)
   */
  getConsolidatedNightEarned(address: string): number {
    const destination = this.getDestinationAddress(address);
    let totalNight = 0;

    // Somar NIGHTs de todos os endereços que apontam para o mesmo destino
    for (const [addr, info] of this.registeredAddresses.entries()) {
      const addrDest = this.getDestinationAddress(addr);
      if (addrDest === destination) {
        totalNight += info.nightEarned;
      }
    }

    return totalNight;
  }
}

