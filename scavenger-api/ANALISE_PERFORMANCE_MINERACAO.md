# 🔍 Análise de Performance - Mineração Midnight

## ⚠️ Problema Reportado

- **Browser com 10 carteiras**: Resolve em menos de 10 minutos
- **Backend com 2 workers**: Mais de 30 minutos sem resolver

## 🔍 Possíveis Causas

### 1. **Inicialização do Nonce Muito Alta**

**Problema atual**:
```typescript
let nonceCounter = BigInt(index * 1000000); // Cada worker começa em um range diferente
```

**Análise**:
- Worker 0: nonce = 0
- Worker 1: nonce = 1,000,000
- Worker 2: nonce = 2,000,000

**No browser**: Provavelmente todos começam do 0 ou valores próximos.

**Solução**: Começar todos os workers do 0 ou valores muito próximos.

### 2. **Velocidade de Mineração**

**Fatores que afetam**:
- WASM performance (Node.js vs Browser)
- Tamanho da ROM (1GB)
- Número de workers simultâneos
- Intervalo entre tentativas

**Comparação**:
- Browser: Pode usar Web Workers paralelos (10 workers = 10 threads)
- Backend: Limitado por `MAX_CONCURRENT_WORKERS` e `MINING_INTERVAL_MS`

### 3. **Validação de Hash Lenta**

**Atual**:
- Cada tentativa valida o hash completo
- ROM é criada apenas uma vez (cache)
- Mas cada hash leva tempo

**Otimização possível**:
- Reduzir intervalo entre tentativas
- Aumentar número de workers
- Verificar se ROM está sendo reutilizada corretamente

## ✅ Verificações Necessárias

### 1. Verificar Algoritmo AshMaize

**Parâmetros corretos**:
```typescript
NB_LOOPS = 8          ✅
NB_INSTRS = 256       ✅
PRE_SIZE = 16777216   ✅ (16MB)
MIXING_NUMBERS = 4    ✅
ROM_SIZE = 1073741824 ✅ (1GB)
```

### 2. Verificar Preimage

**Ordem correta**:
```
nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
```

### 3. Verificar Dificuldade

**Cálculo**:
```typescript
difficulty = min(0x000000FF + (day * 0x10), 0xFFFFFFFF)
```

**Exemplo (dia 4)**:
```
difficulty = 0x000000FF + (4 * 0x10) = 0x000000FF + 0x40 = 0x0000013F
```

### 4. Verificar Nonce

**Formato**: 16 hex chars (64 bits)
**Range**: 0 a FFFFFFFFFFFFFFFF

**Problema potencial**: Se workers começam em 1,000,000, podem estar pulando soluções válidas entre 0 e 1,000,000.

## 🔧 Correções Recomendadas

### 1. **Ajustar Inicialização do Nonce**

```typescript
// ANTES
let nonceCounter = BigInt(index * 1000000);

// DEPOIS - Começar do 0 ou valores próximos
let nonceCounter = BigInt(index * 100); // Ou BigInt(index)
```

### 2. **Aumentar Número de Workers**

```env
MAX_CONCURRENT_WORKERS=10  # Igual ao browser
```

### 3. **Reduzir Intervalo**

```env
MINING_INTERVAL_MS=100  # Mais agressivo
```

### 4. **Adicionar Logs de Performance**

```typescript
if (attemptCount % 1000 === 0) {
  const hashTime = Date.now() - validationStart;
  this.logger.debug(`Tempo médio por hash: ${hashTime}ms`);
}
```

## 🧪 Teste Rápido

Execute o script de teste:

```bash
cd scavenger-api
npx ts-node test-mining-performance.ts
```

Isso vai:
1. ✅ Testar alguns nonces conhecidos
2. ✅ Tentar encontrar solução em 100 tentativas
3. ✅ Medir tempo médio por hash
4. ✅ Verificar se hash está sendo calculado corretamente

## 📊 Comparação Browser vs Backend

### Browser (10 carteiras)
- ✅ 10 workers paralelos
- ✅ Nonce começa do 0
- ✅ WASM otimizado para browser
- ✅ Resolve em < 10 minutos

### Backend (2 workers)
- ⚠️ 2 workers apenas
- ⚠️ Nonce começa em 1,000,000 (worker 2)
- ⚠️ WASM pode ser mais lento no Node.js
- ⚠️ Resolve em > 30 minutos (ou não resolve)

## 🎯 Ação Imediata

1. **Testar nonces baixos** (0 a 1,000,000)
2. **Aumentar workers** para 10
3. **Reduzir intervalo** para 100ms
4. **Verificar logs** de performance

## 🔍 Próximos Passos

1. Executar `test-mining-performance.ts`
2. Verificar se ROM está sendo reutilizada
3. Comparar tempos de hash com browser
4. Ajustar estratégia de nonces

