import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface HashRequest {
  preimage: string;
  no_pre_mine: string;
  difficulty: string;
}

interface HashResponse {
  hash: string;
  meets_difficulty: boolean;
}

@Injectable()
export class AshmaizeNativeService {
  private readonly logger = new Logger(AshmaizeNativeService.name);
  private readonly binPath: string;

  constructor() {
    // Caminho para o binário compilado
    // Em desenvolvimento: target/debug/ashmaize-hash
    // Em produção: target/release/ashmaize-hash
    const isDev = process.env.NODE_ENV !== 'production';
    const buildType = isDev ? 'debug' : 'release';
    
    // __dirname em runtime = scavenger-api/dist/ashmaize
    // Precisamos subir 3 níveis: dist/ashmaize -> dist -> scavenger-api -> midnigth
    const projectRoot = path.resolve(__dirname, '../../..');
    
    this.binPath = path.join(
      projectRoot,
      'ce-ashmaize',
      'target',
      buildType,
      'ashmaize-hash',
    );
    
    // Log para debug
    this.logger.log(`Procurando binário AshMaize em: ${this.binPath}`);
  }

  /**
   * Valida uma solução usando AshMaize real (via binário Rust)
   */
  async validateSolution(
    preimage: string,
    noPreMine: string,
    difficulty: string,
  ): Promise<boolean> {
    try {
      const request: HashRequest = {
        preimage,
        no_pre_mine: noPreMine,
        difficulty,
      };

      const requestJson = JSON.stringify(request);
      const result = await this.callRustBinary(requestJson);

      return result.meets_difficulty;
    } catch (error) {
      this.logger.error(`Erro ao validar solução com AshMaize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula o hash AshMaize do preimage
   */
  async computeHash(
    preimage: string,
    noPreMine: string,
  ): Promise<string> {
    try {
      const request: HashRequest = {
        preimage,
        no_pre_mine: noPreMine,
        difficulty: 'FFFFFFFF', // Usar dificuldade máxima para apenas calcular hash
      };

      const requestJson = JSON.stringify(request);
      const result = await this.callRustBinary(requestJson);

      return result.hash;
    } catch (error) {
      this.logger.error(`Erro ao calcular hash AshMaize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Chama o binário Rust e retorna a resposta
   */
  private async callRustBinary(requestJson: string): Promise<HashResponse> {
    return new Promise((resolve, reject) => {
      // Verificar se o binário existe
      if (!fs.existsSync(this.binPath)) {
        reject(new Error(
          `Binário AshMaize não encontrado em ${this.binPath}. Execute: cd ce-ashmaize && cargo build --package ashmaize-api --bin ashmaize-hash`,
        ));
        return;
      }

      const process = spawn(this.binPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`AshMaize process exited with code ${code}: ${stderr}`));
          return;
        }

        if (stderr) {
          this.logger.warn(`Stderr do AshMaize: ${stderr}`);
        }

        try {
          const response: HashResponse = JSON.parse(stdout.trim());
          resolve(response);
        } catch (error) {
          reject(new Error(`Erro ao parsear resposta do AshMaize: ${error.message}\nOutput: ${stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Erro ao executar AshMaize: ${error.message}`));
      });

      // Enviar request via stdin
      process.stdin.write(requestJson + '\n');
      process.stdin.end();
    });
  }
}

