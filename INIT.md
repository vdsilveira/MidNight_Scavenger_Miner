## Inicialização do Projeto (Midnight Miner)

Este guia cobre o passo a passo para clonar, configurar e rodar a mineração e os testes, tanto na branch `develop` (atual) quanto na `main`.

### 1) Pré‑requisitos
- Node.js LTS (>= 18) e npm
- Git
- Opcional (para binário nativo): Rust toolchain (cargo) e build essentials

Verifique versões:
```bash
node -v
npm -v
git --version
```

### 2) Clonar o repositório e escolher a branch
```bash
git clone <URL_DO_REPOSITORIO> Midnight_Miner
cd Midnight_Miner

# Para usar a branch develop (recomendada)
git checkout develop

# Ou, para usar a branch main
# git checkout main
```

### 3) Configuração de variáveis de ambiente (scavenger-api)
Entre no diretório da API e crie o arquivo `.env` (ou use o existente):
```bash
cd scavenger-api
cp .env.example .env 2>/dev/null || true
```

Edite `.env` conforme necessário. Variáveis mais importantes:
- `SEED_PHRASE`: seed para derivar endereços e assinar registro (obrigatório para mineração automática)
- `AUTO_MINE` (default: `true`)
- `ADDRESS_COUNT` (default: `50`)
- `MAX_CONCURRENT_WORKERS` (default: `5`) — quantidade de workers paralelos
- `MINING_INTERVAL_MS` (default: `10`) — intervalo entre tentativas
- `LOG_MINING_STATS_INTERVAL_MS` (default: `60000`) — logs periódicos com H/s

Exemplo rápido de `.env` mínimo:
```
SEED_PHRASE="palavra1 palavra2 ... palavra24"
AUTO_MINE=true
MAX_CONCURRENT_WORKERS=15
MINING_INTERVAL_MS=4
LOG_MINING_STATS_INTERVAL_MS=60000
```

### 4) Compilar o pacote WASM local `ashmaize-web` (OBRIGATÓRIO)
O `scavenger-api` depende de `ashmaize-web` via `file:../ce-ashmaize/crates/ashmaize-web/pkg`. Você precisa gerar o diretório `pkg` antes de instalar as dependências da API.

```bash
# Dependências de build (se necessário)
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev

# (Se ainda não tiver) Instale o wasm-pack
cargo install wasm-pack --locked 2>/dev/null || true

# Construir o pacote WASM para Node.js
cd /home/norman/codigos/Midnight_Miner/ce-ashmaize/crates/ashmaize-web
~/.cargo/bin/wasm-pack build --target nodejs --release

# Após o build, o diretório 'pkg/' será criado aqui
```

Caso prefira, você pode instalar o wasm-pack via script oficial:
```bash
curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
wasm-pack build --target nodejs --release
```

### 5) Instalar dependências (scavenger-api)
Após o `pkg/` existir, instale as dependências para que o `file:` local seja resolvido corretamente:
```bash
cd /home/norman/codigos/Midnight_Miner/scavenger-api
npm i
```

### 6) Rodar a API (NestJS)
```bash
npm run start:dev
```
Saída esperada (exemplos):
- “Nest application successfully started”
- “🚀 Servidor Scavenger Mine API rodando em http://localhost:3002”
- Logs de mineração a cada 60s (H/s, workers, challenge)

Endpoints úteis para ver status:
```bash
curl http://localhost:3002/wallets/mining-status
curl http://localhost:3002/wallets/challenge-info
```

### 7) Registro e mineração automática
Com `SEED_PHRASE` configurado e `AUTO_MINE=true`, o serviço:
1. Deriva endereços
2. Assina a mensagem de termos
3. Registra cada endereço
4. Inicia a mineração

Quando encontrar solução válida, você verá um log “🎉 Challenge encontrado ...” e a submissão será feita automaticamente.

### 8) Teste de mineração com dificuldade reduzida
Script: `scavenger-api/test-mining-easy.ts`

Executar:
```bash
cd /home/norman/codigos/Midnight_Miner/scavenger-api
npm i
npx ts-node -T test-mining-easy.ts
```
O script usa os parâmetros do challenge atual e reduz a dificuldade para encontrar uma solução rapidamente. Mostra nonce, hash e H/s quando encontra.

### 9) (Opcional) Habilitar binário nativo do AshMaize
O projeto já usa `ashmaize-web` (WASM). Se desejar usar o binário nativo Rust:
```bash
cd /home/norman/codigos/Midnight_Miner/ce-ashmaize
cargo build --package ashmaize-api --bin ashmaize-hash
```
Depois, ajuste o serviço para usar o nativo se aplicável.

### 10) Trocar entre `develop` e `main`
Para alternar a branch:
```bash
cd /home/norman/codigos/Midnight_Miner
git fetch
git checkout develop   # ou: git checkout main
```
Reinstale dependências na API se necessário:
```bash
cd scavenger-api
npm i
```

### 11) Solução de problemas
- Erro “Cannot find module 'ashmaize-web'”: garanta que você executou o passo 4 (wasm-pack build) e depois rodou `npm i` em `scavenger-api`.
- Sem logs de mineração: verifique `SEED_PHRASE` e `AUTO_MINE=true` no `.env`.
- Baixo H/s: ajuste `MAX_CONCURRENT_WORKERS` e `MINING_INTERVAL_MS` conforme os recursos da máquina.
- Erro ao construir ROM (WASM): tente novamente; a criação é pesada e demora.

### 12) Resumo rápido
```bash
# 1) Clonar e selecionar branch
git clone <URL> Midnight_Miner && cd Midnight_Miner && git checkout develop

# 2) Configurar API e .env
cd scavenger-api && cp .env.example .env 2>/dev/null || true
# editar .env (SEED_PHRASE, etc.)

# 3) Construir o WASM local (ashmaize-web)
cd /home/norman/codigos/Midnight_Miner/ce-ashmaize/crates/ashmaize-web
~/.cargo/bin/wasm-pack build --target nodejs --release

# 4) Instalar dependências da API
cd /home/norman/codigos/Midnight_Miner/scavenger-api
npm i

# 5) Subir API
npm run start:dev

# 6) (Opcional) Rodar teste de mineração fácil
npx ts-node -T test-mining-easy.ts
```


