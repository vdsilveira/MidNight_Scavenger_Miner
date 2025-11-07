// register_address_range.mjs
import axios from "axios";
import dotenv from "dotenv";
import * as bip39 from "bip39";
import * as blake from "blakejs";
import { encode } from "cbor-x";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import fs from "fs";

dotenv.config({ path: "../.env" });

const BASE_URL = "https://scavenger.prod.gd.midnighttge.io";
const mnemonic = process.env.SEED_PHRASE;
if (!mnemonic) throw new Error("❌ SEED_PHRASE não encontrada no .env");

// ================================================================
// 1️⃣ Deriva endereço baseado em índice de ACCOUNT (não de address!)
// Caminho: m/1852'/1815'/accountIndex'/0/0
// ================================================================
function deriveAccount(accountIndex = 0) {
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  const rootKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );

  // Caminho: m/1852'/1815'/accountIndex'
  const accountKey = rootKey
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(accountIndex | 0x80000000);

  // 🔹 payment: m/1852'/1815'/accountIndex'/0/0
  const paymentKey = accountKey.derive(0).derive(0).to_raw_key();
  const paymentPubKey = paymentKey.to_public();

  // 🔹 stake: m/1852'/1815'/accountIndex'/2/0
  const stakeKey = accountKey.derive(2).derive(0).to_raw_key();
  const stakePubKey = stakeKey.to_public();

  const networkId = 1; // mainnet
  const baseAddr = Cardano.BaseAddress.new(
    networkId,
    Cardano.StakeCredential.from_keyhash(paymentPubKey.hash()),
    Cardano.StakeCredential.from_keyhash(stakePubKey.hash())
  );

  const address = baseAddr.to_address().to_bech32();

  return {
    address,
    pubKeyHex: Buffer.from(paymentPubKey.as_bytes()).toString("hex"),
    privateKey: paymentKey,
    accountIndex,
  };
}

// ================================================================
// 2️⃣ Assinatura CIP-8 (COSE_Sign1)
// ================================================================
function signMessageCIP8(privateKey, message) {
  const payload = Buffer.from(message, "utf8");
  const protectedHeader = new Map([[1, -8]]); // alg = Ed25519
  const unprotectedHeader = new Map();

  const toSignStructure = [
    "Signature1",
    encode(protectedHeader),
    Buffer.alloc(0),
    payload,
  ];
  const toSignBytes = encode(toSignStructure);
  const sig = privateKey.sign(toSignBytes);

  const coseSign1 = [
    encode(protectedHeader),
    unprotectedHeader,
    payload,
    Buffer.from(sig.to_bytes()),
  ];

  return Buffer.from(encode(coseSign1)).toString("hex");
}

// ================================================================
// 3️⃣ Busca Termos & Condições
// ================================================================
async function fetchTandC() {
  const { data } = await axios.get(`${BASE_URL}/TandC`);
  console.log(`✅ T&C versão: ${data.version}`);
  return data.message;
}

// ================================================================
// 4️⃣ Envia registro
// ================================================================
async function register(address, signature, pubKeyHex, index) {
  const url = `${BASE_URL}/register/${address}/${signature}/${pubKeyHex}`;
  console.log(`📡 [${index}] Registrando ${address}`);
  try {
    const { data } = await axios.post(url, {});
    fs.writeFileSync(
      `./registrationReceipt_${index}.json`,
      JSON.stringify(data, null, 2)
    );
    console.log(`✅ [${index}] Registro completo!`);
  } catch (err) {
    if (err.response) {
      console.error(
        `❌ [${index}] Erro HTTP ${err.response.status}: ${err.response.data.message}`
      );
    } else {
      console.error(`❌ [${index}] Erro: ${err.message}`);
    }
  }
}

// ================================================================
// 5️⃣ Loop principal (defina range no topo)
// ================================================================
const RANGE_START = 28;   // <-- início (inclusive)
const RANGE_END = 100;     // <-- fim (inclusive)

(async () => {
  try {
    console.log(`🔑 Derivando e registrando endereços [${RANGE_START}..${RANGE_END}]`);
    const message = await fetchTandC();

    for (let i = RANGE_START; i <= RANGE_END; i++) {
      console.log("\n============================================");
      console.log(`▶️ Registrando ACCOUNT INDEX ${i}...`);

      const { address, pubKeyHex, privateKey } = deriveAccount(i);

      console.log("📬 Address:", address);
      console.log("🔓 Public Key:", pubKeyHex);

      const signature = signMessageCIP8(privateKey, message);

      console.log("✍️ Assinatura CIP-8:", signature.substring(0, 60) + "...");
      await register(address, signature, pubKeyHex, i);
    }
  } catch (err) {
    console.error("❌ Erro geral:", err.message);
  }
})();
