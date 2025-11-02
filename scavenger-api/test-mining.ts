// Script de teste rápido para verificar se a mineração está funcionando
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

// Testar uma validação rápida
async function testMining() {
  console.log('🧪 Testando mineração...');
  
  const service = new AshmaizeWasmService();
  
  // Dados de teste (baseado em challenge atual)
  const preimage = '0000000000000001addr1q4ccbcc791ac142545118866e8b91faf63d66a65d2bed27b7800accfcD04C030000013Fdbc225c4eb6a8469a1523fa8a3ebb871741f1240fa09e665a5bcacfa64e5e8e32025-11-02T23:59:59.000Z1762046092';
  const noPreMine = 'dbc225c4eb6a8469a1523fa8a3ebb871741f1240fa09e665a5bcacfa64e5e8e3';
  const difficulty = '0000013F';
  
  console.log('Preimage:', preimage.substring(0, 50) + '...');
  console.log('no_pre_mine:', noPreMine.substring(0, 20) + '...');
  console.log('Difficulty:', difficulty);
  
  try {
    const start = Date.now();
    const result = service.validateSolution(preimage, noPreMine, difficulty);
    const elapsed = Date.now() - start;
    
    console.log(`✅ Validação concluída em ${elapsed}ms`);
    console.log(`Resultado: ${result ? 'ATENDE dificuldade!' : 'Não atende dificuldade'}`);
    
    // Testar hash direto
    const hashStart = Date.now();
    const hash = service.computeHash(preimage, noPreMine);
    const hashElapsed = Date.now() - hashStart;
    
    console.log(`\n📊 Hash calculado em ${hashElapsed}ms`);
    console.log(`Hash (primeiros 32 chars): ${hash.substring(0, 32)}...`);
    console.log(`Hash completo: ${hash}`);
    console.log(`\nPrimeiros 8 chars (para verificar dificuldade): ${hash.substring(0, 8)}`);
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
}

testMining().catch(console.error);

