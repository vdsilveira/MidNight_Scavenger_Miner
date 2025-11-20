// donate_to.mjs
import axios from "axios";
import dotenv from "dotenv";
import * as bip39 from "bip39";
import { encode } from "cbor-x";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";

dotenv.config({ path: "../.env" });

const BASE_URL = "https://scavenger.prod.gd.midnighttge.io";
const mnemonic = process.env.SEED_PHRASE2;
if (!mnemonic) throw new Error("❌ SEED_PHRASE2 não encontrada no .env");

// ================================================================
// 1️⃣ Deriva endereço & chaves (mesma lógica do registro)
// ================================================================
function deriveAccount(index = 1) {
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  const rootKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );

  const accountKey = rootKey
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(1 | 0x80000000);

  const paymentKey = accountKey.derive(0).derive(index).to_raw_key();
  const paymentPubKey = paymentKey.to_public();

  const stakeKey = accountKey.derive(2).derive(0).to_raw_key();
  const stakePubKey = stakeKey.to_public();

  const networkId = 1; // MAINNET

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
// 2️⃣ Assinatura CIP-8
// ================================================================
function signMessageCIP8(privateKey, message) {
  const payload = Buffer.from(message, "utf8");

  const protectedHeader = new Map([[1, -8]]); // Ed25519
  const unprotectedHeader = new Map();

  const toSign = [
    "Signature1",
    encode(protectedHeader),
    Buffer.alloc(0),
    payload,
  ];
  const toSignBytes = encode(toSign);

  const sig = privateKey.sign(toSignBytes);

  const cose = [
    encode(protectedHeader),
    unprotectedHeader,
    payload,
    Buffer.from(sig.to_bytes()),
  ];

  return Buffer.from(encode(cose)).toString("hex");
}

// ================================================================
// 3️⃣ Chamada donate_to
// ================================================================
async function donateTo(destination, original, signature) {
  const url = `${BASE_URL}/donate_to/${destination}/${original}/${signature}`;
  console.log(`📡 POST ${url}`);
  const { data } = await axios.post(url, {});
  console.log("✅ Resposta donate_to:\n", JSON.stringify(data, null, 2));
  return data;
}

// ================================================================
// 4️⃣ Execução principal
// ================================================================
(async () => {
  try {
    console.log("🔑 Derivando endereço original...");
    const { address: originalAddress, privateKey } = deriveAccount(0);

    console.log("📬 Original address:", originalAddress);

    const destinationAddress =
      "addr1qxemvvgh5hfedv26g2qd7mancmqpkhyq4frtdmzemawz954kmx75g3ntj0jd7km30k0jlf5u9qvu5jyrj27xcmvz3v2qexg0ta";

    // Mensagem exata exigida no whitepaper
    const message = `Assign accumulated Scavenger rights to: ${destinationAddress}`;

    console.log("\n🪪 Mensagem a assinar:\n", message);

    const signature = signMessageCIP8(privateKey, message);

    console.log("✍️ Signature (CIP-8):", signature);

    console.log("\n📤 Enviando donate_to...");
    await donateTo(destinationAddress, originalAddress, signature);
  } catch (err) {
    if (err.response)
      console.error("❌ Erro HTTP:", err.response.status, err.response.data);
    else console.error("❌ Erro:", err.message);
  }
})();
