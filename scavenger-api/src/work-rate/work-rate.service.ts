import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkRateService {
  private readonly dailyStarRates = [
    // Exemplo de taxas por dia (em produção, calcular baseado em fórmulas específicas)
    10882519, // Dia 1
    7692307,  // Dia 2
    12487254, // Dia 3
    // ... adicionar mais dias conforme necessário
  ];

  getWorkToStarRate(): number[] {
    const now = new Date();
    const startDate = new Date('2025-10-30T00:00:00Z');
    const endDate = new Date('2025-11-20T23:59:59Z');

    // Se antes do início ou depois do fim, retornar array vazio
    if (now < startDate || now > endDate) {
      return [];
    }

    // Calcular dia atual
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

    // Retornar apenas as taxas dos dias que já passaram
    if (daysSinceStart <= 0) {
      return [];
    }

    // Retornar taxas até o dia atual
    return this.dailyStarRates.slice(0, Math.min(daysSinceStart, this.dailyStarRates.length));
  }
}

