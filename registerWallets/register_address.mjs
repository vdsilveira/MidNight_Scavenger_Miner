// register_address_node.mjs
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
// 1️⃣ Deriva chaves e endereço base mainnet (igual ao da Eternl)
// ================================================================
function deriveAccount(index = 0) {
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  const rootKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );

  // Caminho padrão m/1852'/1815'/0'
  const accountKey = rootKey
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(1 | 0x80000000);

  // 🔹 payment key: m/1852'/1815'/0'/0/0
  const paymentKey = accountKey.derive(0).derive(index).to_raw_key();
  const paymentPubKey = paymentKey.to_public();

  // 🔹 stake key: m/1852'/1815'/0'/2/0
  const stakeKey = accountKey.derive(2).derive(0).to_raw_key();
  const stakePubKey = stakeKey.to_public();

  // 🚀 Rede mainnet
  const protocolMagic = 764824073;
  const networkId = 1;

  // ✅ BaseAddress (payment + stake)
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

  const coseHex = Buffer.from(encode(coseSign1)).toString("hex");
  return coseHex;
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
async function register(address, signature, pubKeyHex) {
  const url = `${BASE_URL}/register/${address}/${signature}/${pubKeyHex}`;
  console.log(`📡 POST ${url}`);
  const { data } = await axios.post(url, {});
  fs.writeFileSync("./registrationReceipt.json", JSON.stringify(data, null, 2));
  console.log("✅ Registro completo!");
  console.log(JSON.stringify(data, null, 2));
}

// ================================================================
// 5️⃣ Execução principal
// ================================================================
(async () => {
  try {
    console.log("🔑 Derivando endereço...");
    const { address, pubKeyHex, privateKey } = deriveAccount(0);

    console.log("📬 Address:", address);
    console.log("🔓 Public Key:", pubKeyHex);

    console.log("\n📄 Buscando T&C...");
    const message = await fetchTandC();
    console.log("🪪 Mensagem a assinar:\n", message);

    console.log("✍️ Gerando assinatura CIP-8...");
    const signature = signMessageCIP8(privateKey, message);

    console.log("\n🧩 Verificação manual (Cardano Foundation):");
    console.log("Public Key:", pubKeyHex);
    console.log("Message:", message);
    console.log("Signature:", signature);
    console.log("🔗 https://verifycardanomessage.cardanofoundation.org/\n");

    console.log("📤 Enviando registro...");
    await register(address, signature, pubKeyHex);
  } catch (err) {
    if (err.response)
      console.error("❌ Erro HTTP:", err.response.status, err.response.data);
    else console.error("❌ Erro:", err.message);
  }
})();
