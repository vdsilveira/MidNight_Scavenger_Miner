# 🔄 Detecção de Mudança de Challenge - Midnight Mining

Este documento explica como o sistema detecta quando a hora muda e o challenge muda, e o que acontece com os dados de mineração.

## 🕐 Como Funciona a Mudança de Challenge

### Frequência de Mudança

**Challenges mudam a cada hora UTC**:
- Challenge atual = baseado na hora UTC atual
- `challenge_number = floor(hours_utc / 1) + 1`
- Formato: `D##C##` (Dia##Challenge##)

**Exemplo**:
- 00:00 UTC → `D01C01`
- 01:00 UTC → `D01C02`
- 02:00 UTC → `D01C03`
- ...
- 23:00 UTC → `D01C24`

## ✅ Sistema de Detecção Implementado

### 1. Detecção Automática no AutoMiner (`auto-miner.service.ts`)

**Como funciona**:
- ✅ Cada worker verifica o challenge a cada iteração
- ✅ Compara `challenge_id` atual com o último conhecido
- ✅ Se diferente, detecta mudança automaticamente

**Logs quando detecta**:
```
🔄 Challenge mudou: D01C01 → D01C02 (Hora: 2025-10-30T01:00:00.000Z)
🗑️  Limpando ROM do challenge anterior: D01C01
```

**O que acontece**:
1. ✅ Detecta mudança de `challenge_id`
2. ✅ Limpa ROM do challenge anterior
3. ✅ Atualiza rastreadores
4. ✅ Notifica callbacks (se houver)

### 2. Monitor de Challenge (`challenge-monitor.service.ts`)

**Como funciona**:
- ✅ Verifica mudanças a cada 60 segundos
- ✅ Rastreia `challenge_id` atual
- ✅ Compara com último conhecido
- ✅ Loga quando detecta mudança

**Endpoint disponível**:
```bash
GET /challenge/status
```

**Resposta**:
```json
{
  "currentChallengeId": "D01C02",
  "challenge": { ... },
  "hasChanged": true,
  "lastChallengeId": "D01C01",
  "nextChangeAt": "2025-10-30T02:00:00.000Z",
  "timestamp": "2025-10-30T01:15:00.000Z"
}
```

### 3. Endpoints para Verificar Mudanças

#### Verificar se Challenge Mudou
```bash
GET /wallets/challenge-changed
```

**Resposta**:
```json
{
  "changed": true,
  "currentChallengeId": "D01C02",
  "lastChallengeId": "D01C01",
  "timestamp": "2025-10-30T01:15:00.000Z"
}
```

#### Obter Informações Completas do Challenge
```bash
GET /wallets/challenge-info
```

**Resposta**:
```json
{
  "currentChallengeId": "D01C02",
  "lastChallengeId": "D01C01",
  "hasChanged": true,
  "lastNoPreMine": "...",
  "currentNoPreMine": "...",
  "challenge": { ... }
}
```

## 📊 O Que Muda Quando Challenge Muda

### ✅ Dados que Mudam

1. **Challenge ID** (`D01C01` → `D01C02`)
2. **no_pre_mine** (muda porque depende do `challenge_id`)
3. **ROM** (nova ROM é criada com novo `no_pre_mine`)
4. **Dificuldade** (muda apenas se mudar o dia)
5. **Challenge Number** (incrementa a cada hora)

### ✅ O Que NÃO Muda

1. **Soluções já submetidas** (permanecem no storage)
2. **Endereços registrados** (permanecem registrados)
3. **NIGHT ganhos** (permanecem contabilizados)
4. **Estados de mineração** (workers continuam minerando)

### ✅ O Que Acontece Automaticamente

1. **ROM antiga é limpa** (libera memória)
2. **Nova ROM é criada** (para novo challenge)
3. **Workers continuam minerando** (agora para novo challenge)
4. **Logs são gerados** (para rastreamento)

## 🔍 Como Verificar no Frontend

### Detecção Automática

O frontend agora detecta automaticamente mudanças:
- ✅ Verifica a cada 5 segundos (mesmo intervalo de atualização)
- ✅ Compara `challenge_id` atual com último conhecido
- ✅ Mostra notificação quando detecta mudança

### Notificação Visual

Quando o challenge muda, aparece uma notificação:
```
🔄 Challenge Mudou!
Novo challenge detectado: D01C02
```

## 🧪 Como Testar Manualmente

### 1. Verificar Challenge Atual

```bash
curl http://localhost:3002/challenge/current
```

### 2. Verificar Status (se mudou)

```bash
curl http://localhost:3002/wallets/challenge-changed
```

### 3. Verificar Informações Completas

```bash
curl http://localhost:3002/challenge/status
```

### 4. Monitorar Logs em Tempo Real

```bash
# Ver logs da API
tail -f logs/nestjs.log | grep "Challenge mudou"
```

## 📝 Exemplo de Fluxo de Mudança

### Antes da Mudança (00:59 UTC)

```
Challenge atual: D01C01
no_pre_mine: abc123...
ROM em cache: 1GB (para D01C01)
Workers minerando: 2 workers ativos
```

### Durante a Mudança (01:00 UTC)

```
🔄 Challenge mudou: D01C01 → D01C02 (Hora: 2025-10-30T01:00:00.000Z)
🗑️  Limpando ROM do challenge anterior: D01C01
🔨 Building ROM for challenge D01C02...
✅ ROM created and cached for challenge D01C02
```

### Depois da Mudança (01:01 UTC)

```
Challenge atual: D01C02
no_pre_mine: def456... (novo)
ROM em cache: 1GB (para D01C02, ROM antiga foi limpa)
Workers minerando: 2 workers ativos (continuam minerando)
```

## 🔧 Configuração

### Intervalo de Verificação

O monitor verifica a cada **60 segundos** por padrão.

Para mudar, edite `challenge-monitor.service.ts`:
```typescript
this.checkInterval = setInterval(() => {
  this.checkForChallengeChange();
}, 60000); // Mudar para intervalo desejado (em ms)
```

### Logs de Detecção

Os logs aparecem automaticamente quando detecta mudança:
- ✅ Log no console da API
- ✅ Log no console do frontend (se habilitado)
- ✅ Notificação visual no frontend

## 📊 Dados de Mineração Quando Challenge Muda

### ✅ Soluções Já Encontradas

**NÃO são perdidas**:
- ✅ Soluções do challenge anterior permanecem no storage
- ✅ Cada solução tem seu `challenge_id` associado
- ✅ Estatísticas continuam contabilizando todas as soluções

### ✅ Workers de Mineração

**Continuam funcionando**:
- ✅ Workers detectam mudança automaticamente
- ✅ Continuam minerando para novo challenge
- ✅ Nonce counter continua (não é resetado)
- ✅ Tentativas continuam sendo contabilizadas

### ✅ ROM e Memória

**Gerenciamento automático**:
- ✅ ROM do challenge anterior é removida
- ✅ Nova ROM é criada para novo challenge
- ✅ Apenas 1 ROM fica em cache (do challenge atual)
- ✅ Memória sempre ~1GB (não acumula)

## 🎯 Resumo

### ✅ Sistema Detecta Automaticamente

1. ✅ Mudança de `challenge_id` (a cada hora)
2. ✅ Mudança de `no_pre_mine`
3. ✅ Limpeza de ROMs antigas
4. ✅ Criação de nova ROM
5. ✅ Logs informativos

### ✅ Frontend Mostra

1. ✅ Notificação visual quando muda
2. ✅ Challenge atual sempre atualizado
3. ✅ Timer para próximo challenge
4. ✅ Status de conexão

### ✅ API Disponibiliza

1. ✅ `/challenge/current` - Challenge atual
2. ✅ `/challenge/status` - Status completo
3. ✅ `/wallets/challenge-info` - Informações detalhadas
4. ✅ `/wallets/challenge-changed` - Se mudou desde última verificação

## 🚀 Como Usar

### Verificar se Mudou Agora

```bash
curl http://localhost:3002/wallets/challenge-changed
```

### Ver Status Completo

```bash
curl http://localhost:3002/challenge/status
```

### Ver no Frontend

O frontend atualiza automaticamente e mostra notificação quando detecta mudança.

## ✅ Conclusão

O sistema agora:
- ✅ Detecta mudanças automaticamente
- ✅ Limpa dados antigos (ROMs)
- ✅ Cria novos dados (nova ROM)
- ✅ Mantém histórico (soluções antigas)
- ✅ Loga todas as mudanças
- ✅ Notifica no frontend

**Você não precisa fazer nada** - o sistema detecta e gerencia tudo automaticamente! 🎉

