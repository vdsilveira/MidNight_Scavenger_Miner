# 🔍 Como Verificar se o Challenge Mudou

Este guia rápido mostra como verificar se o challenge mudou após mudança de hora.

## 🚀 Métodos Rápidos

### 1. Via API (Mais Rápido)

```bash
# Verificar se mudou
curl http://localhost:3002/wallets/challenge-changed

# Ver informações completas
curl http://localhost:3002/challenge/status
```

### 2. Via Frontend

O frontend mostra automaticamente:
- ✅ Notificação no topo quando detecta mudança
- ✅ Challenge atual sempre visível
- ✅ Timer para próximo challenge

### 3. Via Logs

```bash
# Ver logs em tempo real
tail -f logs/nestjs.log | grep "Challenge mudou"

# Ou ver todos os logs
npm run start:dev
# Procurar por: "🔄 Challenge mudou"
```

## 📊 O Que Mudou?

### Quando Challenge Muda:

1. **Challenge ID**: `D01C01` → `D01C02`
2. **no_pre_mine**: Novo valor (64 hex chars)
3. **ROM**: Nova ROM criada (1GB)
4. **Challenge Number**: Incrementa (1 → 2)

### O Que NÃO Mudou:

1. ✅ Soluções já submetidas (permanecem)
2. ✅ Endereços registrados (permanecem)
3. ✅ Workers de mineração (continuam)

## 🔄 Detecção Automática

O sistema detecta automaticamente:

- ✅ **A cada iteração do worker** (verifica challenge atual)
- ✅ **A cada 60 segundos** (monitor dedicado)
- ✅ **A cada 5 segundos** (frontend atualiza)

## ✅ Verificação Rápida

### Terminal 1: Verificar Challenge Atual
```bash
curl http://localhost:3002/challenge/current | jq '.challenge.challenge_id'
```

### Terminal 2: Verificar se Mudou
```bash
watch -n 5 'curl -s http://localhost:3002/wallets/challenge-changed | jq'
```

### Terminal 3: Ver Logs
```bash
tail -f logs/nestjs.log | grep -E "(Challenge mudou|Building ROM)"
```

## 🎯 Resposta da API

### Challenge Mudou? (`/wallets/challenge-changed`)
```json
{
  "changed": true,
  "currentChallengeId": "D01C02",
  "lastChallengeId": "D01C01",
  "timestamp": "2025-10-30T01:15:00.000Z"
}
```

### Status Completo (`/challenge/status`)
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

## ✅ Checklist de Verificação

- [ ] Challenge ID mudou?
- [ ] ROM antiga foi limpa?
- [ ] Nova ROM foi criada?
- [ ] Workers continuam minerando?
- [ ] Frontend mostrou notificação?
- [ ] Logs apareceram no console?

## 📝 Exemplo de Uso

### Verificar Agora
```bash
curl http://localhost:3002/wallets/challenge-changed
```

Se `"changed": true`, o challenge mudou!

### Ver Qual Challenge Está Ativo
```bash
curl http://localhost:3002/challenge/current | jq '.challenge.challenge_id'
```

### Ver Quando Mudará Próxima Vez
```bash
curl http://localhost:3002/challenge/status | jq '.nextChangeAt'
```

## 🎉 Conclusão

**O sistema detecta automaticamente!** Você só precisa:
1. Verificar endpoints acima (opcional)
2. Ver notificação no frontend (automático)
3. Ver logs (automático)

Tudo funciona automaticamente! 🚀

