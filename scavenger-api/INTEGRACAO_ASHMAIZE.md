# Integração do AshMaize Real

## Situação Atual

Atualmente, a implementação usa uma **simulação** do algoritmo AshMaize. Para produção, você precisa integrar o código Rust real do AshMaize.

## Opções de Integração

### Opção 1: Compilar para WASM (Recomendado)

O projeto `ce-ashmaize` já tem suporte para WASM. Você pode usar o código em `crates/ashmaize-web`.

**Passos:**

1. Compilar o AshMaize para WASM:
```bash
cd ce-ashmaize
wasm-pack build crates/ashmaize-web --target nodejs
```

2. Instalar no projeto NestJS:
```bash
cd scavenger-api
npm install ../ce-ashmaize/crates/ashmaize-web/pkg
```

3. Usar no código:
```typescript
import init, { Rom, RomBuilder } from 'ashmaize-web';

async function validateSolution(preimage: string, noPreMine: string) {
  await init();
  
  // Criar ROM conforme especificação
  const builder = Rom.builder();
  builder.key(hexToBytes(noPreMine));
  builder.gen_two_steps(16777216, 4); // pre_size=16MB, mixing_numbers=4
  builder.size(1073741824); // rom_size=1GB
  
  const rom = builder.build();
  
  // Calcular hash
  const preimageBytes = new TextEncoder().encode(preimage);
  const hash = rom.hash(preimageBytes, 8, 256); // nbLoops=8, nbInstrs=256
  
  return hash;
}
```

### Opção 2: Node.js Addon (N-API)

Compilar o código Rust como um addon nativo do Node.js.

**Passos:**

1. Criar um crate Rust wrapper:
```rust
// Cargo.toml
[lib]
crate-type = ["cdylib"]

[dependencies]
ashmaize = { path = "../../" }
napi = { version = "2", features = ["napi4"] }
napi-derive = "2"
```

2. Criar função wrapper:
```rust
#[napi]
pub fn hash_ashmaize(preimage: String, no_pre_mine: String) -> Vec<u8> {
    use ashmaize::{Rom, RomGenerationType};
    
    let rom_seed = hex::decode(no_pre_mine).unwrap();
    let gen_type = RomGenerationType::TwoStep {
        pre_size: 16777216,
        mixing_numbers: 4,
    };
    
    let rom = Rom::new(&rom_seed, gen_type, 1073741824);
    let preimage_bytes = preimage.as_bytes();
    
    ashmaize::hash(preimage_bytes, &rom, 8, 256).to_vec()
}
```

3. Compilar e usar:
```typescript
const addon = require('./ashmaize-addon.node');

function validateSolution(preimage: string, noPreMine: string) {
  const hashBytes = addon.hashAshmaize(preimage, noPreMine);
  const hash = Buffer.from(hashBytes).toString('hex');
  return hash;
}
```

### Opção 3: Executar Binário Rust via Child Process

Criar um binário Rust que recebe parâmetros e retorna o hash.

**Vantagens:**
- Mais simples de implementar
- Não requer compilação de addons

**Desvantagens:**
- Overhead de spawn process
- Menos performático

## Configuração Correta Conforme Documento

Conforme o PDF "Midnight - Whitepaper treatment for Scavenger Mine API V3":

```typescript
const CONFIG = {
  nbLoops: 8,                    // Fixo
  nbInstrs: 256,                 // Fixo
  preSize: 16777216,            // 16MB
  mixingNumbers: 4,              // Fixo
  romSize: 1073741824,          // 1GB
};

// ROM deve ser inicializado com:
const romSeed = hexToBytes(noPreMine); // do challenge

// Preimage deve ser construído como:
const preimage = [
  nonce,              // 16 hex chars (64 bits)
  address,            // endereço Cardano
  challenge_id,       // ex: "**D07C10"
  difficulty,         // ex: "0000FFFF"
  no_pre_mine,        // hex string
  latest_submission,  // ISO 8601 date
  no_pre_mine_hour,   // string numérica
].join('');
```

## Validação da Dificuldade

A dificuldade é um hex de 4 bytes que especifica quais bits devem ser **zero** nos primeiros 4 bytes do hash.

**Exemplo do documento:**
- Dificuldade: `0000FFFF`
- Hash: `00069420fb04137812fb7f35fab2f0e...`
- Prefixo do hash: `00069420`
- Verificação: Os 16 bits mais significativos (4 primeiros hex chars) devem ser zero
- `0006` tem zeros nos bits mais significativos ✓

**Implementação:**
```typescript
function checkDifficulty(hash: string, difficulty: string): boolean {
  const hashPrefix = hash.substring(0, 8); // Primeiros 4 bytes
  const hashNum = parseInt(hashPrefix, 16);
  const difficultyNum = parseInt(difficulty, 16);
  
  // Máscara de bits que devem ser zero
  const zeroMask = (~difficultyNum) & 0xFFFFFFFF;
  
  // Verificar se os bits zero correspondem
  return (hashNum & zeroMask) === 0;
}
```

## Próximos Passos

1. ✅ Configuração correta do AshMaize conforme documento
2. ⏳ Integrar código Rust real (WASM ou Addon)
3. ⏳ Testar com vetores de teste do documento
4. ⏳ Validar performance

