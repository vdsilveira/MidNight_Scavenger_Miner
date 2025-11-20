# 🚀 Midnight Scavenger Mine — Full Mining, Consolidation & Balance Guide

Este repositório contém **tudo que você precisa** para:

- ⛏️ Minerar o Midnight Scavenger com múltiplos endereços derivados  
- 🔐 Derivar endereços Cardano diretamente da sua seed phrase  
- 📝 Registrar wallets automaticamente  
- 📡 Submeter soluções automaticamente  
- 🔄 Consolidar todos os NIGHT via `donate_to`  
- 💰 Calcular o total acumulado de NIGHT em todos os endereços  
- 🖥️ Monitorar tudo com um dashboard moderno em tempo real

---

## 📘 Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração .env (Obrigatório)](#configuração-env-obrigatório)
3. [Buildar AshMaize](#buildar-ashmaize)
4. [Iniciar a API](#iniciar-a-api)
5. [Iniciar o Dashboard](#iniciar-o-dashboard)
6. [Fluxo Automático de Mineração](#fluxo-automático-de-mineração)
7. [Consolidação (donate_to)](#consolidação-donate_to)
8. [Ver Total de NIGHT Acumulado](#ver-total-de-night-acumulado)
9. [Performance & Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)
11. [Segurança](#segurança)
12. [Referência Rápida](#referência-rápida)

---

## 📋 Pré-requisitos

- Node.js v18 ou superior
- Rust + Cargo
- Git
- npm ou yarn
- Recomendado: 8 GB RAM

---

## 🔐 Configuração .env (Obrigatório)

```env
# Sua seed phrase de 24 palavras
SEED_PHRASE="palavra1 palavra2 palavra3 ... palavra24"

# Endereço principal (receberá todas as doações)
MAIN_ADDRESS=addr1qx...

# Quantos endereços derivados quer usar
ADDRESS_COUNT=50

# Ativar mineração automática
AUTO_MINE=true

# Número máximo de workers simultâneos
MAX_CONCURRENT_WORKERS=10

# Intervalo entre tentativas (ms)
MINING_INTERVAL_MS=500

# Usar miner WASM otimizado (recomendado)
WASM_ENABLED=true

NODE_ENV=production
```

⚠️ Nunca compartilhe sua seed phrase  
⚠️ O arquivo `.env` já está no `.gitignore`

---

## 🔧 Buildar AshMaize

```bash
cd ce-ashmaize
cargo build --package ashmaize-api --bin ashmaize-hash
```

Binário gerado em: `ce-ashmaize/target/debug/ashmaize-hash`

---

## 🚀 Iniciar a API

```bash
cd scavenger-api
npm install
npm run start:dev
```

A API faz tudo automaticamente:
- Carrega a seed phrase
- Deriva os endereços
- Registra todas as wallets
- Inicia a mineração
- Submete soluções

API rodando em → http://localhost:3000

---

## 🎨 Iniciar o Dashboard

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm run dev
```

Dashboard rodando em → http://localhost:3001

---

## 🧬 Fluxo Automático de Mineração

Seed → endereços derivados → wallets registradas → mineração ativa → soluções enviadas → dashboard atualizado  
**Zero trabalho manual.** ⛏️🔥

---

## 🔄 Consolidação (donate_to)

Script: `donate_to/multi_donate_address.mjs`

```js
const DESTINATION = process.env.MAIN_ADDRESS; // pega automaticamente do .env

const RANGE_START = 0;
const RANGE_END = 150; // ajuste conforme necessário
```

Executar:
```bash
cd donate_to
node multi_donate_address.mjs
```

Transfere **todo** o NIGHT de todos os endereços para o `MAIN_ADDRESS`.

Exemplo de saída:
```
[12] Success → donation_id: 4a8969ee-81d9-...
[47] Success → donation_id: 8f3c1d2a-...
```

---

## 💰 Ver Total de NIGHT Acumulado

Script: `donate_to/total.mjs`

```js
const RANGE_START = 0;
const RANGE_END = 500; // ajuste aqui
```

Executar:
```bash
cd donate_to
node total.mjs
```

Exemplo de saída:
```yaml
🎉 ENDEREÇOS COM SALDO:
index | address        | night
0     | addr1q8...     | 753.889449
1     | addr1qx...     | 697.968697
47    | addr1qy...     | 1201.443201

💎 TOTAL NIGHT ACUMULADO: 5760.510567
```

---

## ⚡ Performance & Tuning

**PC bom (recomendado):**
```env
MAX_CONCURRENT_WORKERS=10
MINING_INTERVAL_MS=500
WASM_ENABLED=true
```

**PC mais fraco:**
```env
MAX_CONCURRENT_WORKERS=3
MINING_INTERVAL_MS=2000
```

Otimizações já ativas:
- Miner WASM oficial (mesmo do site)
- ROM carregada só uma vez
- Pool de workers inteligente
- Workers encerram ao achar solução

---

## 🐛 Troubleshooting

- Seed inválida → confira as 24 palavras, sem espaços extras
- Mineração travando → diminua workers ou aumente intervalo
- Erro no donate_to → wallet não registrada ainda / challenge expirado
- Dashboard vazio → aguarde 30-60s para registro, depois F5

---

## 🔒 Segurança

- .env nunca sai da sua máquina
- Seed nunca é enviada pra lugar nenhum
- Backup offline criptografado
- NUNCA mande seed no chat
- NUNCA tire print
- NUNCA commit o .env

---

## 🎉 Referência Rápida

| Ação                       | Comando                                      |
|----------------------------|----------------------------------------------|
| Build AshMaize             | `cargo build` (em ce-ashmaize)               |
| Iniciar API                | `npm run start:dev` (em scavenger-api)       |
| Iniciar Dashboard          | `npm run dev` (em frontend)                  |
| Consolidar tudo            | `node multi_donate_address.mjs`              |
| Ver total NIGHT            | `node total.mjs`                             |
| Status mineração           | Dashboard (atualiza sozinho)                 |

---

**Agora está 100% limpo.**  
Copia tudo isso (do # até o final) → cola num arquivo novo → salva como `README.md`.  
Vai renderizar perfeito no GitHub sem nenhum erro.

Happy mining, king! ⛏️🌕