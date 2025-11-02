# 🚀 Midnight Scavenger Mine - Guia Completo de Inicialização

Este guia completo mostra como iniciar e usar toda a infraestrutura do Scavenger Mine API com **mineração automática** de múltiplos endereços.

## 📋 Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Rust e Cargo (para compilar AshMaize)
- Git

## 🔐 Passo 0: Configurar Seed Phrase (OBRIGATÓRIO)

**IMPORTANTE**: Antes de iniciar, configure sua seed phrase da carteira Eternl:

### 0.1. Criar Arquivo `.env`

Na pasta raiz do projeto (`midnigth/`):

```bash
cd /l/disk0/viniciusd/Projetos/ambintes/midnigth
cp .env.example .env
nano .env
```

### 0.2. Adicionar Configurações

```env
# Sua seed phrase da carteira Eternl (24 palavras separadas por espaço)
SEED_PHRASE=sua seed phrase aqui com todas as 24 palavras

# Endereço principal de destino (m/1852'/1815'/0'/0/0)
# Este é o endereço que receberá todas as consolidações
MAIN_ADDRESS=addr1qxemvvgh5hfedv26g2qd7mancmqpkhyq4frtd...j0jd7km30k0jlf5u9qvu5jyrj27xcmvz3v2qexg0ta

# Número de endereços para derivar e minerar (padrão: 50)
ADDRESS_COUNT=50

# Mineração automática ao iniciar (true/false)
AUTO_MINE=true

# OTIMIZAÇÕES DE PERFORMANCE (para evitar travamento):
# Máximo de workers simultâneos (padrão: 5)
# Reduza para 2-3 se o computador estiver travando
MAX_CONCURRENT_WORKERS=5

# Intervalo entre tentativas de mineração em ms (padrão: 1000ms = 1 segundo)
# Aumente para 2000-5000 se ainda estiver sobrecarregado
MINING_INTERVAL_MS=1000
```

**⚠️ NUNCA commite o `.env` no Git!**

📖 **Documentação completa**: Ver `scavenger-api/COMO_CONFIGURAR_SEED.md`

## 🔧 Passo 1: Compilar o AshMaize (Binário Rust)

Primeiro, precisamos compilar o binário Rust que será usado pela API:

```bash
cd ce-ashmaize
cargo build --package ashmaize-api --bin ashmaize-hash
```

Isso criará o binário em: `ce-ashmaize/target/debug/ashmaize-hash`

**Nota**: A primeira compilação pode demorar vários minutos.

## 🚀 Passo 2: Iniciar a API NestJS

### 2.1. Instalar Dependências

```bash
cd scavenger-api
npm install
```

### 2.2. Iniciar Servidor

```bash
# Desenvolvimento (com hot reload)
npm run start:dev
```

**🎉 Mágica acontece aqui!** Quando a API inicia:

1. ✅ Lê a seed phrase do `.env`
2. ✅ Deriva automaticamente os primeiros 50 endereços (m/1852'/1815'/0'/0/0 até /49)
3. ✅ Registra todos os endereços automaticamente
4. ✅ Inicia mineração paralela para cada endereço

**Você não precisa fazer nada!** A mineração começa automaticamente! 🚀⛏️

A API estará rodando em: **http://localhost:3000**

## 🎨 Passo 3: Iniciar o Frontend Dashboard

### 3.1. Instalar Dependências

```bash
cd frontend
npm install
```

### 3.2. Configurar Variáveis

Crie o arquivo `.env.local`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
```

### 3.3. Iniciar Dashboard

```bash
npm run dev
```

O dashboard estará disponível em: **http://localhost:3001**

## 📝 Passo 4: Configurar Carteiras no Dashboard

Após iniciar a API, os endereços serão registrados automaticamente. Para vê-los no dashboard:

### Opção A: Via Página de Setup (Recomendado)

1. Acesse: http://localhost:3001/setup-wallets.html
2. As carteiras já devem estar no localStorage após o registro automático
3. Se não estiverem, adicione manualmente usando o formato JSON

### Opção B: Via Console do Navegador

1. Acesse: http://localhost:3001
2. Abra o console (F12)
3. As carteiras devem aparecer automaticamente após serem registradas pela API

## 🎯 O que Acontece Automaticamente

Quando você inicia a API com `SEED_PHRASE` configurada:

1. **Derivação**: Sistema deriva 50 endereços da sua seed phrase
2. **Registro**: Cada endereço é registrado na API automaticamente
3. **Mineração**: Cada endereço começa a minerar em paralelo
4. **Monitoramento**: Você pode acompanhar tudo no dashboard

## 📊 Monitorar no Dashboard

Abra http://localhost:3001 e você verá:

- **Estatísticas Gerais**: Total de carteiras, submissions, NIGHT earned
- **Desafio Atual**: Informações do desafio ativo com timer
- **Atividade Diária**: Grid mostrando progresso
- **Cards de Carteiras**: 
  - ✅ **Verde (Submitted)**: Carteira já enviou solução
  - ⏳ **Laranja (Pending)**: Carteira aguardando envio

**O dashboard atualiza automaticamente a cada 30 segundos!**

## 🔗 Consolidar Soluções (Ao Final da Campanha)

**Ao final da campanha de mineração**, use o botão no dashboard:

1. **Acesse o dashboard**: http://localhost:3001
2. **Role até a seção "Consolidação"** no final da página
3. **Clique no botão**: "🔄 Consolidar Todas as Soluções para Endereço Principal"
4. **Confirme a ação**

Isso consolidará **automaticamente** todas as soluções dos 50 endereços derivados para o endereço principal (m/1852'/1815'/0'/0/0).

**Via API (alternativa)**:
```bash
curl -X POST http://localhost:3000/consolidation/all-to-main
```

## 📊 Endpoints da API

### Públicos

- `GET /TandC` - Termos e condições
- `GET /TandC/:version` - Termos por versão
- `GET /challenge` - Desafio atual
- `GET /work_to_star_rate` - Taxa de trabalho STAR
- `POST /register/:address/:signature/:pubkey` - Registrar endereço
- `POST /solution/:address/:challenge_id/:nonce` - Submeter solução
- `POST /donate_to/:destination/:original/:signature` - Consolidar soluções
- `GET /wallets` - Listar carteiras
- `GET /wallets/stats` - Estatísticas de carteiras
- `POST /consolidation/all-to-main` - **Consolidar tudo automaticamente**

## 🛠️ Scripts Úteis

### Mineração Manual (se necessário)

```bash
# Listar carteiras registradas
npm run miner -- --list

# Ver desafio atual
npm run miner -- --challenge

# Mineração manual (normalmente não necessário - é automático!)
npm run miner -- --mine <address>
```

### Consolidar Manualmente

```bash
npm run multi-miner -- --consolidate-all <target_address>
```

## ⚡ Otimizações de Performance

### Problema: Computador Travando Durante Mineração

**Causa Original**: Estávamos criando um **processo Rust separado** para cada hash, e cada processo criava uma **ROM de 1GB** do zero. Com 5 workers = 5 processos = **5GB de RAM** sendo criados continuamente!

**Solução Implementada**: 
1. ✅ **Migrado para WASM** (WebAssembly) - mesma implementação dos browsers
2. ✅ **ROM é cacheada** - criada uma vez por `no_pre_mine` e reutilizada
3. ✅ **Roda no mesmo processo Node.js** - sem overhead de processos separados
4. ✅ **Compatível com implementação de browsers** - mesma performance leve

**Antes (Processos Rust)**:
- Cada hash = novo processo = nova ROM de 1GB
- 5 workers = 5GB RAM constantemente
- Sistema travava completamente

**Depois (WASM com Cache)**:
- ROM criada uma vez e cacheada
- Reutilizada para todos os hashes com mesmo `no_pre_mine`
- 1GB RAM total (não importa quantos workers)
- Sistema leve como nos browsers

**Soluções Implementadas**:
1. ✅ **Pool de Workers Limitado**: Máximo de 5 workers simultâneos (configurável)
2. ✅ **Intervalo Aumentado**: 1000ms entre tentativas (ao invés de 100ms)
3. ✅ **Fila de Processamento**: Endereços aguardam em fila até ter espaço no pool
4. ✅ **Parada Automática**: Workers param automaticamente quando encontram solução

### Configurar Performance no `.env`

```env
# Com WASM otimizado, você pode usar mais workers sem problemas
# Recomendado: 10-25 workers (como outros mineradores fazem)
MAX_CONCURRENT_WORKERS=10

# Intervalo entre tentativas (ms)
# Com WASM cacheado, pode ser mais rápido
MINING_INTERVAL_MS=500
```

**Nota**: Com a migração para WASM, o sistema agora é muito mais leve. Você pode aumentar `MAX_CONCURRENT_WORKERS` para 10-25 sem problemas, similar a outros mineradores que rodam 25 workers por computador.

### ⚠️ Importante: Uma Solução NÃO Prova Todas as Carteiras

**Cada endereço precisa encontrar sua própria solução válida!**

O preimage inclui o endereço: `nonce + address + challenge_id + ...`

Portanto:
- ❌ **NÃO** é possível usar uma solução de um endereço para provar outros
- ✅ Cada endereço deve encontrar seu próprio nonce válido
- ✅ O sistema otimizado garante que todos os 50 endereços serão processados
- ✅ Workers param automaticamente quando encontram solução, liberando recursos

### Comparação de Performance

**ANTES (Problema)**:
- 50 workers × 10 tentativas/segundo = **500 chamadas Rust/segundo**
- Sistema sobrecarregado e travando

**DEPOIS (Otimizado)**:
- 5 workers simultâneos × 1 tentativa/segundo = **5 chamadas Rust/segundo**
- Redução de **99% na carga do sistema**
- Sistema estável e responsivo

**Tempo para processar todos os 50 endereços**:
- Com pool de 5 workers: ~10 endereços/minuto (assumindo que alguns já encontraram solução)
- Total: todos os endereços serão processados em fila até encontrarem solução

## 🐛 Troubleshooting

### Seed Phrase não funciona

- Verifique se todas as 24 palavras estão corretas
- Verifique se não há espaços extras
- Certifique-se de usar palavras válidas do BIP39

### Computador Travando Durante Mineração

1. **Reduza `MAX_CONCURRENT_WORKERS`** para 2 ou 3 no `.env`
2. **Aumente `MINING_INTERVAL_MS`** para 2000-5000ms
3. **Reinicie a API** após alterar o `.env`

### Mineração não inicia automaticamente

1. Verifique se `SEED_PHRASE` está no `.env`
2. Verifique se `AUTO_MINE=true`
3. Veja os logs da API para erros

### Endereços não aparecem no dashboard

1. Certifique-se de que a API registrou os endereços (veja logs)
2. Use a página de setup para adicionar manualmente
3. Verifique o console do navegador (F12)

### API não inicia

```bash
# Verificar erros
npm run build

# Verificar se porta 3000 está livre
lsof -i :3000
```

## 📚 Documentação Adicional

- `scavenger-api/README.md` - Documentação completa da API
- `scavenger-api/COMO_CONFIGURAR_SEED.md` - **Como configurar seed phrase**
- `scavenger-api/COMO_USAR_FRONTEND.md` - Guia detalhado do frontend
- `scavenger-api/GUIA_MULTI_ENDERECOS.md` - Guia de múltiplos endereços
- `scavenger-api/INTEGRACAO_ASHMAIZE.md` - Detalhes técnicos do AshMaize

## ✅ Checklist de Inicialização

- [ ] **Configurar seed phrase no `.env`** (OBRIGATÓRIO)
- [ ] Compilar AshMaize (`cargo build`)
- [ ] Instalar dependências da API (`npm install`)
- [ ] Iniciar API (`npm run start:dev`) - **Inicia mineração automática!**
- [ ] Instalar dependências do frontend (`cd frontend && npm install`)
- [ ] Iniciar frontend (`npm run dev`)
- [ ] Verificar dashboard para ver carteiras minerando
- [ ] Ao final da campanha, usar botão de consolidação no frontend

## 🎉 Resumo do Fluxo Automático

1. **Configurar `.env`** com seed phrase
2. **Iniciar API** → Mineração automática começa!
3. **Iniciar Frontend** → Visualizar progresso
4. **Aguardar** → Mineração acontece automaticamente
5. **Ao final** → Clicar botão de consolidação no dashboard

**Tudo é automático!** Você só precisa configurar a seed phrase uma vez. 🚀

## 🔒 Segurança

### ✅ FAÇA:
- Mantenha o `.env` apenas local
- Use `.gitignore` para excluir `.env`
- Faça backup seguro da seed phrase
- Nunca compartilhe sua seed phrase

### ❌ NÃO FAÇA:
- Commit do `.env` no Git
- Compartilhar seed phrase online
- Enviar por email/mensagem

---

**Boa mineração! 🚀⛏️💰**
