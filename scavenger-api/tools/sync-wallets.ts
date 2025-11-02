/**
 * Script para sincronizar carteiras registradas com o frontend
 * 
 * Uso:
 *   npm run sync-wallets
 * 
 * Isso exporta as carteiras registradas para o localStorage do frontend
 */

import { ScavengerMiner } from './miner-cli';
import * as fs from 'fs';
import * as path from 'path';

async function syncWallets() {
  const miner = new ScavengerMiner();
  const frontendPath = path.join(__dirname, '../frontend/public/wallets.json');
  
  // Obter todas as carteiras registradas
  const addresses = miner.getRegisteredAddresses();
  
  if (addresses.length === 0) {
    console.log('❌ Nenhuma carteira registrada encontrada');
    console.log('   Use: npm run miner -- --register <address> <pubkey> <signature>');
    return;
  }

  // Formatar dados para o frontend
  const walletsData = addresses.map((addr, index) => ({
    id: `wallet-${index + 1}`,
    address: addr.address,
    pubkey: addr.pubkey,
    registered: true,
  }));

  // Salvar em arquivo JSON que o frontend pode ler
  const publicDir = path.dirname(frontendPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(frontendPath, JSON.stringify(walletsData, null, 2));
  
  console.log(`✅ ${addresses.length} carteira(s) sincronizada(s) com o frontend`);
  console.log(`   Arquivo: ${frontendPath}`);
  console.log(`\n💡 Para ver no frontend:`);
  console.log(`   1. Abra http://localhost:3001`);
  console.log(`   2. Execute no console do navegador:`);
  console.log(`      localStorage.setItem('midnight-wallets', JSON.stringify(${JSON.stringify(walletsData)}));`);
  console.log(`   3. Recarregue a página`);
}

if (require.main === module) {
  syncWallets().catch(console.error);
}

export { syncWallets };

