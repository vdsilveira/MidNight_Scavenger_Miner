# 🚀 Como Iniciar os Serviços

## ⚠️ IMPORTANTE: Portas dos Serviços

- **API NestJS**: Porta `3002` (http://localhost:3002)
- **Frontend Next.js**: Porta `3001` (http://localhost:3001)

## 📋 Passos para Iniciar

### 1. Iniciar a API (Terminal 1)

```bash
cd scavenger-api
npm run start:dev
```

Você deve ver:
```
🚀 Servidor Scavenger Mine API rodando em http://localhost:3002
```

### 2. Iniciar o Frontend (Terminal 2)

```bash
cd scavenger-api/frontend
PORT=3001 npm run dev
```

Você deve ver:
```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3001
```

### 3. Verificar se Está Funcionando

**Testar API:**
```bash
curl http://localhost:3002/TandC
curl http://localhost:3002/challenge
```

**Abrir Frontend:**
Abra o navegador em: http://localhost:3001

## 🔧 Troubleshooting

### Erro: "Cannot connect to API"
- Verifique se a API está rodando na porta 3002
- Verifique se não há conflito de portas
- Verifique se o CORS está habilitado

### Erro: "Frontend não mostra nada"
- Verifique se a API está respondendo: `curl http://localhost:3002/challenge`
- Abra o console do navegador (F12) e veja os erros
- Verifique se o frontend está rodando na porta 3001

### Porta já em uso
- Para mudar a porta da API, use: `PORT=3003 npm run start:dev`
- Para mudar a porta do frontend, use: `PORT=3002 npm run dev`
- **IMPORTANTE**: Se mudar as portas, atualize `NEXT_PUBLIC_API_URL` no frontend

## 📝 Configuração do Frontend

O frontend usa a variável de ambiente `NEXT_PUBLIC_API_URL`:
- **Padrão**: `http://localhost:3002`
- **Para mudar**: Crie um arquivo `.env.local` em `scavenger-api/frontend/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## ✅ Checklist

- [ ] API rodando na porta 3002
- [ ] Frontend rodando na porta 3001
- [ ] API respondendo em `/TandC` e `/challenge`
- [ ] Frontend acessível em http://localhost:3001
- [ ] Sem erros no console do navegador

