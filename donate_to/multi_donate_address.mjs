// donate_to_address_range.mjs
import axios from "axios";
import dotenv from "dotenv";
import * as bip39 from "bip39";
import { encode } from "cbor-x";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";

dotenv.config({ path: "../.env" });

const BASE_URL = "https://scavenger.prod.gd.midnighttge.io";
const mnemonic = process.env.SEED_PHRASE;
if (!mnemonic) throw new Error("❌ SEED_PHRASE não encontrada no .env");

// ================================================================
// 1️⃣ Deriva ACCOUNT index (igual ao seu script)
// Caminho: m/1852'/1815'/accountIndex'/0/0
// ================================================================
function deriveAccount(accountIndex = 0) {
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

  const address = baseAddr.to_address().to_bech32();

  return {
    address,
    privateKey: paymentKey,
    accountIndex,
  };
}

// ================================================================
// 2️⃣ Assinatura CIP-8
// ================================================================
function signMessageCIP8(privateKey, message) {
  const payload = Buffer.from(message, "utf8");

  const protectedHeader = new Map([[1, -8]]);
  const unprotectedHeader = new Map();

  const toSign = [
    "Signature1",
    encode(protectedHeader),
    Buffer.alloc(0),
    payload,
  ];
  const sig = privateKey.sign(encode(toSign));

  const cose = [
    encode(protectedHeader),
    unprotectedHeader,
    payload,
    Buffer.from(sig.to_bytes()),
  ];

  return Buffer.from(encode(cose)).toString("hex");
}

// ================================================================
// 3️⃣ donate_to call
// ================================================================
async function donateTo(destination, original, signature, index) {
  const url = `${BASE_URL}/donate_to/${destination}/${original}/${signature}`;

  console.log(`📡 [${index}] POST donate_to`);
  try {
    const { data } = await axios.post(url, {});
    console.log(`✅ [${index}] Success → donation_id: ${data.donation_id}`);
    return data;
  } catch (err) {
    if (err.response)
      console.error(
        `❌ [${index}] HTTP ${err.response.status}: ${err.response.data.message}`
      );
    else console.error(`❌ [${index}] Erro: ${err.message}`);
  }
}

// ================================================================
// 4️⃣ PARAMETROS
// ================================================================
const RANGE_START = 0;
const RANGE_END =150;

const DESTINATION = process.env.DESTINATION_ADDRESS;
if (!DESTINATION) throw new Error("❌ DESTINATION_ADDRESS não encontrada no .env");
  

// Mensagem fixa do whitepaper
const buildMessage = (dst) =>
  `Assign accumulated Scavenger rights to: ${dst}`;

// ================================================================
// 5️⃣ LOOP PRINCIPAL
// ================================================================
(async () => {
  console.log(`🚀 Iniciando donate_to para contas [${RANGE_START}..${RANGE_END}]`);
  const message = buildMessage(DESTINATION);

  for (let i = RANGE_START; i <= RANGE_END; i++) {
    console.log("\n============================================");
    console.log(`▶️ Processando ACCOUNT INDEX ${i}`);

    const { address, privateKey } = deriveAccount(i);

    console.log(`📬 Original: ${address}`);

    const signature = signMessageCIP8(privateKey, message);

    console.log(`✍️ [${i}] Signature CIP-8: ${signature.substring(0, 50)}...`);

    await donateTo(DESTINATION, address, signature, i);
  }
})();
