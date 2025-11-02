# 🔧 Correção de Performance - Mineração Midnight

## ⚠️ Problema Identificado

**Browser (10 carteiras)**: Resolve em < 10 minutos
**Backend (2 workers)**: > 30 minutos sem resolver

## 🔍 Causa Raiz Encontrada

### **Problema Principal: Nonce Começando Muito Alto**

**Código antigo**:
```typescript
let nonceCounter = BigInt(index * 1000000); // ❌ PROBLEMA!
```

**Análise**:
- Worker 0: nonce = 0 ✅
- Worker 1: nonce = 1,000,000 ❌ (pula primeiros 1 milhão)
- Worker 2: nonce = 2,000,000 ❌ (pula primeiros 2 milhões)

**No browser**: Todos começam do 0 ou valores próximos, então testam **todos** os nonces do início.

**Consequência**: Se a solução válida está entre 0 e 1,000,000, o Worker 1 nunca encontra. Se está entre 1,000,000 e 2,000,000, o Worker 2 não testa a primeira parte desse range.

## ✅ Correção Aplicada

**Código novo**:
```typescript
// ✅ Ajustado: Começar nonces próximos ao 0 para não perder soluções no início
// Browser normalmente começa do 0, então vamos fazer o mesmo
// Usar index * 10 para distribuir ligeiramente, mas não pular grandes ranges
let nonceCounter = BigInt(index * 10); // ✅ CORRIGIDO!
```

**Agora**:
- Worker 0: nonce = 0 ✅
- Worker 1: nonce = 10 ✅ (muito próximo)
- Worker 2: nonce = 20 ✅ (muito próximo)

**Resultado**: Todos os workers testam desde o início, não pulam ranges grandes.

## 📊 Comparação

### Antes (❌ Problema)
```
Worker 0: 0, 1, 2, 3, ... até 999,999
Worker 1: 1,000,000, 1,000,001, ... (pula 0-999,999!)
Worker 2: 2,000,000, 2,000,001, ... (pula 0-1,999,999!)
```

**Problema**: Se solução está em 500,000, apenas Worker 0 testa!

### Depois (✅ Correto)
```
Worker 0: 0, 1, 2, 3, ...
Worker 1: 10, 11, 12, 13, ...
Worker 2: 20, 21, 22, 23, ...
```

**Vantagem**: Todos testam desde o início, maior probabilidade de encontrar rapidamente!

## 🎯 Outras Verificações

### ✅ Algoritmo AshMaize Correto

Verificado:
- ✅ NB_LOOPS = 8
- ✅ NB_INSTRS = 256
- ✅ PRE_SIZE = 16777216 (16MB)
- ✅ MIXING_NUMBERS = 4
- ✅ ROM_SIZE = 1073741824 (1GB)
- ✅ TwoStep generation
- ✅ ROM compartilhada (cache)

### ✅ Preimage Construção Correta

Ordem verificada:
```
nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
```

### ✅ Dificuldade Correta

Para dia 4:
```
difficulty = 0x000000FF + (4 * 0x10) = 0x0000013F
```

## 🧪 Como Testar

### 1. Executar Script de Teste

```bash
npm run test:mining
```

Isso vai:
- Testar alguns nonces conhecidos
- Tentar encontrar solução em 100 tentativas
- Medir tempo médio por hash

### 2. Verificar Logs da Mineração

```bash
# Ver logs em tempo real
tail -f logs/nestjs.log | grep -E "(Worker|tentativas|SOLUÇÃO)"
```

### 3. Monitorar Performance

Verificar:
- Tempo por hash (deve ser < 100ms)
- Tentativas por segundo
- Se ROM está sendo reutilizada

## 📈 Melhorias Adicionais Recomendadas

### 1. Aumentar Workers (se necessário)

```env
MAX_CONCURRENT_WORKERS=10  # Igual ao browser
```

### 2. Reduzir Intervalo (opcional)

```env
MINING_INTERVAL_MS=100  # Mais agressivo (padrão: 1000)
```

### 3. Adicionar Logs de Performance

Já implementado - logs a cada 1000 tentativas mostram:
- Tentativas realizadas
- Nonce atual
- Tempo de validação
- Hash prefix (para debug)

## ✅ Resumo

### Correção Principal
- ✅ **Nonce agora começa próximo do 0** (não mais em 1,000,000 * index)
- ✅ **Todos os workers testam desde o início**
- ✅ **Maior probabilidade de encontrar solução rapidamente**

### Validações
- ✅ Algoritmo AshMaize correto
- ✅ Preimage construído corretamente
- ✅ Dificuldade calculada corretamente
- ✅ ROM compartilhada entre workers

### Próximos Passos
1. ✅ Código corrigido
2. ⏳ Testar com `npm run test:mining`
3. ⏳ Monitorar logs da mineração
4. ⏳ Comparar performance com browser

## 🎉 Esperado

Com a correção, o backend deve:
- ✅ Encontrar soluções mais rapidamente
- ✅ Não perder soluções válidas no início do range
- ✅ Performance comparável ao browser (considerando diferença de número de workers)

**A diferença de performance restante será principalmente devido ao número de workers (2 vs 10), não mais ao algoritmo ou estratégia de nonces!**

