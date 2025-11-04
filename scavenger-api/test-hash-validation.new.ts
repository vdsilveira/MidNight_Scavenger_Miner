import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service.test';

async function testHashValidationNew() {
  const service = new AshmaizeWasmService();
  
  // Usar valores do teste Rust (wasm.rs)
  const testKey = '313233'; // hex de "123"
  const testInput = '68656c6c6f'; // hex de "hello"
  
  // Teste com valores do wasm.rs
  console.log('\n🧪 Teste 1: Valores do teste Rust');
  const valid1 = service.validateSolution(
    testInput,
    testKey.padStart(64, '0'),  // pad para 64 chars
    '00001FFF'  // dificuldade exemplo
  );
  
  // Teste com nonce conhecido
  console.log('\n🧪 Teste 2: Nonce conhecido');
  const valid2 = service.validateSolution(
    '000000000e000000',
    '0101010101010101010101010101010101010101010101010101010101010101',
    '00001FFF'
  );
  
  console.log('\nResultados:');
  console.log('Teste 1 (Rust):', valid1);
  console.log('Teste 2 (Nonce):', valid2);
}

testHashValidationNew().catch(console.error);