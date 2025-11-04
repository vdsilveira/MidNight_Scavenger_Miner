import { NestFactory } from '@nestjs/core';
import { TestModule } from './test.module';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';
import { Logger } from '@nestjs/common';

async function testBrowserHash() {
  const app = await NestFactory.create(TestModule);
  const ashmaize = app.get<AshmaizeWasmService>(AshmaizeWasmService);
  const logger = new Logger('TestBrowserHash');

  // Dados do browser
  const nonce = '0002006ec1059a77';
  const address = 'addr1q8zylq27r648tnznc2cq0nwf3p8n4g8k4dedwymk6pynh6kjnpzk098kj20fmpep2s7p2pjvpymmktfk8tqcx2kl9w6s50wjhd';
  const challengeId = '**D06C09';
  const difficulty = '00001FFF';
  const noPreMine = '2195117868fda6589768280c95b23819f0f6e28e61d580fd7c7b8f181769fb45';
  const latestSubmission = '2025-11-05T07:59:59.000Z';
  const noPreMineHour = '424085764';

  // Construir preimage exatamente como no browser
  const preimage = [
    nonce,
    address,
    challengeId,
    difficulty,
    noPreMine,
    latestSubmission,
    noPreMineHour
  ].join('');

  // Calcular hash
  const hashHex = ashmaize.computeHash(preimage, noPreMine);
  
  // Log do hash e validação
  logger.log(`Preimage: ${preimage}`);
  logger.log(`Hash gerado: ${hashHex}`);
  logger.log(`Hash esperado: 00000574ebaafc82c01509961f7d2946b0ab7899378ae746aee6fa674f2498b46275d4a8b521b12a444be350e57267592df9cc67dcb7c25a2c39b374baa68707`);
  
  // Validar dificuldade
  const valid = ashmaize.validateSolution(preimage, noPreMine, difficulty);
  logger.log(`Validação de dificuldade: ${valid}`);
}

testBrowserHash().catch(console.error);