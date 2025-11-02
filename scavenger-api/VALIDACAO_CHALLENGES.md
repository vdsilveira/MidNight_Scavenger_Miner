# 🧪 Validação de Challenges - Midnight Scavenger Mine

Este documento explica como verificar se o backend está resolvendo os challenges corretamente conforme a especificação do Midnight.

## 📋 Checklist de Validação

### ✅ 1. Construção do Preimage

**Especificação Midnight**:
```
preimage = nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour
```

**Verificação**:
```bash
npm run test:challenge
```

**Testes executados**:
- ✅ Ordem dos componentes
- ✅ Sem separadores
- ✅ Formato de cada componente

### ✅ 2. Formato do Nonce

**Especificação Midnight**:
- 16 caracteres hexadecimais (64 bits)
- Formato: `[0-9a-fA-F]{16}`

**Verificação**:
```bash
npm run test:challenge
```

**Testes executados**:
- ✅ Nonces válidos aceitos
- ✅ Nonces inválidos rejeitados

### ✅ 3. Formato do no_pre_mine

**Especificação Midnight**:
- 64 caracteres hexadecimais (32 bytes)
- Determinístico baseado no challenge_id
- SHA256(ROM_SEED:challenge_id)

**Verificação**:
```bash
npm run test:challenge
```

**Testes executados**:
- ✅ Tamanho correto (64 chars)
- ✅ Formato hex válido
- ✅ Determinístico (mesma entrada = mesma saída)

### ✅ 4. Cálculo da Dificuldade

**Especificação Midnight**:
```
difficulty = min(0x000000FF + (day * 0x10), 0xFFFFFFFF)
```

**Verificação**:
```bash
npm run test:challenge
```

**Testes executados**:
- ✅ Cálculo correto para diferentes dias
- ✅ Formato hex (8 caracteres, maiúsculas)

### ✅ 5. Formato do Challenge ID

**Especificação Midnight**:
```
challenge_id = "D" + day (2 dígitos) + "C" + challenge_number (2 dígitos)
```

**Verificação**:
```bash
npm run test:challenge
```

**Testes executados**:
- ✅ Formato correto (D##C##)
- ✅ Valores corretos para diferentes dias/números

### ✅ 6. Cálculo do Hash AshMaize

**Especificação Midnight**:
- ROM: 1GB (TwoStep com pre_size=16MB, mixing_numbers=4)
- Loops: 8
- Instruções: 256
- Hash: 64 bytes (128 hex chars)

**Verificação**:
```bash
npm run test:hash
```

**Requisito**: Binário Rust compilado
```bash
cd ../ce-ashmaize
cargo build --package ashmaize-api --bin ashmaize-hash
```

**Testes executados**:
- ✅ Hash calculado corretamente
- ✅ Tamanho correto (128 hex chars)
- ✅ Formato hex válido
- ✅ Determinístico (mesmo input = mesmo hash)
- ✅ Validação de dificuldade funciona

### ✅ 7. Validação de Dificuldade

**Especificação Midnight**:
```
zeroMask = ~difficulty & 0xFFFFFFFF
meetsDifficulty = (hashPrefix & zeroMask) === 0
```

**Verificação**:
```bash
npm run test:hash
```

**Testes executados**:
- ✅ Lógica de validação correta
- ✅ Comparação com cálculo Rust

## 🚀 Como Executar os Testes

### Teste de Challenge (Sem dependências externas)

```bash
cd scavenger-api
npm run test:challenge
```

Este teste verifica:
- Construção do preimage
- Formato do nonce
- Formato do no_pre_mine
- Cálculo da dificuldade
- Formato do challenge_id
- Ordem do preimage
- Conversão para bytes

### Teste de Hash (Requer binário Rust)

```bash
# Primeiro, compilar o binário
cd ../ce-ashmaize
cargo build --package ashmaize-api --bin ashmaize-hash

# Depois, executar o teste
cd ../scavenger-api
npm run test:hash
```

Este teste verifica:
- Cálculo do hash AshMaize
- Determinismo do hash
- Validação de dificuldade
- Comparação com lógica manual

## 📊 Resultados Esperados

### ✅ Teste de Challenge

Todos os testes devem passar:
```
Total de testes: 15+
✅ Passou: 15+
❌ Falhou: 0
📈 Taxa de sucesso: 100.0%
```

### ✅ Teste de Hash

Todos os testes devem passar:
```
Total de testes: 10+
✅ Passou: 10+
❌ Falhou: 0
📈 Taxa de sucesso: 100.0%
```

## 🔍 Verificação Manual

### 1. Verificar Preimage no Backend

Adicione logs temporários em `solution.service.ts`:

```typescript
const preimage = this.buildPreimage(...);
console.log('Preimage:', preimage);
console.log('Preimage length:', preimage.length);
console.log('Preimage components:', {
  nonce: nonce,
  address: address,
  challengeId: challenge.challenge_id,
  difficulty: challenge.difficulty,
  noPreMine: challenge.no_pre_mine,
  latestSubmission: challenge.latest_submission,
  noPreMineHour: challenge.no_pre_mine_hour,
});
```

### 2. Verificar Hash Calculado

Adicione logs em `ashmaize-wasm.service.ts`:

```typescript
const hex = Buffer.from(hash).toString('hex');
console.log('Hash calculado:', hex);
console.log('Hash length:', hex.length);
console.log('Hash prefix:', hex.substring(0, 16));
```

### 3. Verificar Validação de Dificuldade

Adicione logs em `ashmaize-wasm.service.ts`:

```typescript
const meetsDifficulty = this.checkDifficulty(hex, difficulty);
console.log('Difficulty check:', {
  hashPrefix,
  difficulty,
  hashNum: hashNum.toString(16),
  diffNum: diffNum.toString(16),
  zeroMask: zeroMask.toString(16),
  meetsDifficulty,
});
```

## 🐛 Problemas Comuns

### Hash não atende dificuldade

**Possíveis causas**:
1. Preimage construído incorretamente
2. ROM criada com seed errada
3. Lógica de dificuldade incorreta

**Solução**:
1. Executar `npm run test:challenge` para verificar preimage
2. Verificar logs do cálculo do hash
3. Comparar com validação manual

### Hash não é determinístico

**Possíveis causas**:
1. ROM não sendo compartilhada
2. no_pre_mine diferente a cada chamada

**Solução**:
1. Verificar que ROM é cacheada por no_pre_mine
2. Verificar que no_pre_mine é determinístico

### Challenge ID incorreto

**Possíveis causas**:
1. Cálculo do dia incorreto
2. Cálculo do número do challenge incorreto
3. Formato incorreto

**Solução**:
1. Executar `npm run test:challenge`
2. Verificar logs do `challenge.service.ts`

## ✅ Conclusão

Se todos os testes passarem:
- ✅ O backend está construindo o preimage corretamente
- ✅ O hash AshMaize está sendo calculado corretamente
- ✅ A validação de dificuldade está funcionando
- ✅ O backend está conforme a especificação Midnight

Se algum teste falhar:
- 🔍 Verifique os logs para identificar o problema
- 📝 Compare com a especificação do Midnight
- 🐛 Corrija o problema identificado
- 🔄 Execute os testes novamente

