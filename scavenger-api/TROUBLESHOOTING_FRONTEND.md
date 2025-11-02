# 🔧 Troubleshooting - Frontend Não Carrega Informações

## ✅ Correções Aplicadas

### 1. **Verificação de Conexão Melhorada**

Adicionado `useEffect` separado para verificar conexão com API a cada 10 segundos:

```typescript
useEffect(() => {
  const checkConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/wallets/stats`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      if (!res.ok) {
        console.error(`❌ API não respondeu: ${res.status} ${res.statusText}`)
        setStats(prev => ({ ...prev, status: "disconnected" }))
      }
    } catch (error) {
      console.error("❌ Erro de conexão com API:", error)
      setStats(prev => ({ ...prev, status: "disconnected" }))
    }
  }
  
  checkConnection()
  const connectionCheck = setInterval(checkConnection, 10000)
  return () => clearInterval(connectionCheck)
}, [])
```

### 2. **Tratamento de Erros Individual**

Cada chamada de API agora tem tratamento de erro individual:

```typescript
fetch(`${API_BASE}/wallets/stats`).catch(err => {
  console.error("Erro ao buscar stats:", err)
  return { ok: false } as Response
})
```

### 3. **Logs Detalhados**

Console logs adicionados para debug:
- `📊 Stats recebidos:`
- `🎯 Challenge recebido:`
- `💼 Wallets recebidos:`
- `📊 Challenge info recebido:`

## 🔍 Como Diagnosticar

### Verificar se API Está Rodando

```bash
# Verificar se porta 3002 está aberta
curl http://localhost:3002/wallets/stats

# Ver logs da API
tail -f logs/nestjs.log
```

### Verificar Console do Browser

1. Abra o Developer Tools (F12)
2. Vá para a aba Console
3. Procure por erros ou logs:
   - `❌ Erro de conexão com API`
   - `📊 Stats recebidos`
   - `🎯 Challenge recebido`

### Verificar Network Tab

1. Abra Developer Tools (F12)
2. Vá para aba Network
3. Verifique se requisições estão sendo feitas
4. Verifique status codes (200 = OK, 404 = não encontrado, etc)

## 🛠️ Possíveis Problemas e Soluções

### Problema 1: API Não Está Rodando

**Sintoma**: Console mostra `❌ Erro de conexão com API`

**Solução**:
```bash
# Iniciar API
cd scavenger-api
npm run start:dev
```

### Problema 2: Porta Errada

**Sintoma**: Erro de conexão, mas API está rodando

**Solução**: Verificar variável de ambiente:
```bash
# No terminal do frontend
echo $NEXT_PUBLIC_API_URL

# Ou verificar .env.local do frontend
cat frontend/.env.local
```

Adicionar se não existir:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Problema 3: CORS

**Sintoma**: Erro CORS no console

**Solução**: Verificar `main.ts` - CORS já está habilitado:
```typescript
app.enableCors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: '*',
});
```

### Problema 4: Formato de Resposta Diferente

**Sintoma**: Dados não aparecem, mas API responde

**Solução**: Já implementado suporte para múltiplos formatos:
```typescript
const walletsArray = Array.isArray(walletsData) 
  ? walletsData 
  : walletsData.wallets || walletsData.data || []
```

## 🧪 Teste Rápido

### 1. Testar Endpoints Individualmente

```bash
# Stats
curl http://localhost:3002/wallets/stats

# Challenge
curl http://localhost:3002/challenge/current

# Wallets
curl http://localhost:3002/wallets

# Challenge Info
curl http://localhost:3002/wallets/challenge-info
```

### 2. Verificar no Browser

1. Abra `http://localhost:3000` (ou porta do frontend)
2. Abra Console (F12)
3. Verifique logs e erros

### 3. Verificar Network

1. Abra Developer Tools (F12)
2. Aba Network
3. Recarregue a página
4. Veja se requisições estão sendo feitas e se respondem

## 📊 Status de Conexão

O frontend agora mostra status de conexão:

- ✅ `status: "connected"` - API está respondendo
- ❌ `status: "disconnected"` - API não está respondendo

Este status é atualizado:
- ✅ A cada 5 segundos (carregamento de dados)
- ✅ A cada 10 segundos (verificação de conexão)

## ✅ Checklist de Verificação

- [ ] API está rodando? (`npm run start:dev` em `scavenger-api`)
- [ ] Frontend está rodando? (`npm run dev` em `frontend`)
- [ ] Porta correta? (3002 para API, 3000 para frontend)
- [ ] Variável `NEXT_PUBLIC_API_URL` configurada?
- [ ] Console do browser mostra erros?
- [ ] Network tab mostra requisições?
- [ ] CORS está habilitado? (já está no código)

## 🚀 Solução Rápida

Se nada funcionar, reinicie tudo:

```bash
# Terminal 1: Backend
cd scavenger-api
npm run start:dev

# Terminal 2: Frontend
cd scavenger-api/frontend
npm run dev

# Terminal 3: Ver logs
tail -f scavenger-api/logs/nestjs.log
```

## 📝 Logs Úteis

### Backend (Console)
- `🚀 Servidor Scavenger Mine API rodando em http://localhost:3002`
- `🎉 SOLUÇÃO SUBMETIDA!`
- `🔄 Challenge mudou: ...`

### Frontend (Browser Console)
- `📊 Stats recebidos:`
- `🎯 Challenge recebido:`
- `💼 Wallets recebidos:`
- `❌ Erro de conexão com API:`

## ✅ Conclusão

O frontend agora tem:
- ✅ Verificação de conexão periódica
- ✅ Tratamento de erros individual
- ✅ Logs detalhados para debug
- ✅ Suporte para múltiplos formatos de resposta
- ✅ Status de conexão visível

Se ainda não funcionar, verifique os logs do console e do backend!

