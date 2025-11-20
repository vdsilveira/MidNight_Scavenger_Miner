// total.mjs
import axios from "axios";
import dotenv from "dotenv";
import * as bip39 from "bip39";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import fs from "fs/promises";

dotenv.config({ path: "../.env" });

const BASE_URL = "https://scavenger.prod.gd.midnighttge.io/statistics";

const mnemonic = process.env.SEED_PHRASE;

if (!mnemonic) throw new Error("❌ SEED_PHRASE não encontrada no .env");

// -------------------------------------------------------------
// Função de delay simples
// -------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------------------------------------------
// Deriva endereço baseado no account index
// -------------------------------------------------------------
function deriveAddress(accountIndex = 0) {
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  const rootKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );

  const accountKey = rootKey
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(accountIndex | 0x80000000);

  const paymentKey = accountKey.derive(0).derive(0).to_raw_key();
  const paymentPubKey = paymentKey.to_public();

  const stakeKey = accountKey.derive(2).derive(0).to_raw_key();
  const stakePubKey = stakeKey.to_public();

  const networkId = 1;

  const baseAddr = Cardano.BaseAddress.new(
    networkId,
    Cardano.StakeCredential.from_keyhash(paymentPubKey.hash()),
    Cardano.StakeCredential.from_keyhash(stakePubKey.hash())
  );

  return baseAddr.to_address().to_bech32();
}

// -------------------------------------------------------------
// Consulta NIGHT allocation para 1 endereço (com retry no 429)
// -------------------------------------------------------------
async function fetchNightForAddress(address, index) {
  const url = `${BASE_URL}/${address}`;

  while (true) {
    try {
      const { data } = await axios.get(url, { timeout: 8000 });

      // convert microNIGHT -> NIGHT real
      return (data.local?.night_allocation || 0) / 1_000_000;

    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.log(
          `⚠️  [${index}] 429 Too Many Requests — aguardando 3s e tentando novamente`
        );
        await sleep(3000);
        continue;
      }

      console.log(
        `❌ [${index}] Erro inesperado → ${err.message} — considerando como 0`
      );
      return 0;
    }
  }
}

// -------------------------------------------------------------
// Loop principal
// -------------------------------------------------------------
const RANGE_START = 0;
const RANGE_END = 150;

let totalNight = 0;
let nonZero = [];

console.log(`🚀 Verificando NIGHT allocation para endereços [${RANGE_START}..${RANGE_END}]`);

for (let i = RANGE_START; i <= RANGE_END; i++) {
  const address = deriveAddress(i);

  console.log(`🔍 [${i}] Consultando ${address.substring(0, 20)}...`);

  const night = await fetchNightForAddress(address, i);

  if (night > 0) {
    console.log(`💰 [${i}] NIGHT = ${night.toLocaleString("en-US")}`);
    totalNight += night;

    nonZero.push({
      index: i,
      address,
      night: Number(night.toFixed(6)),
    });

  } else {
    console.log(`➜ [${i}] ZERO NIGHT`);
  }

  await sleep(1000); // Delay de 1s entre requisições
}

console.log("\n====================================================");
console.log("🎉 ENDEREÇOS COM SALDO:");
console.table(nonZero);

console.log(
  `\n💎 TOTAL NIGHT ACUMULADO: ${totalNight.toLocaleString("en-US", {
    minimumFractionDigits: 6,
  })}`
);
console.log("====================================================\n");
