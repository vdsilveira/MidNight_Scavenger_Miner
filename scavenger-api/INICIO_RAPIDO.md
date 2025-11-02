# 🚀 Início Rápido - Midnight Miner Dashboard

## Passo 1: Iniciar a API

```bash
cd scavenger-api
npm run start:dev
```

API rodará em: **http://localhost:3000**

## Passo 2: Iniciar o Frontend

```bash
cd frontend
npm run dev
```

Frontend rodará em: **http://localhost:3001**

## Passo 3: Registrar Carteiras

```bash
# Voltar para raiz do projeto
cd ..

# Registrar primeira carteira
npm run miner -- --register <address> <pubkey> <signature>

# Registrar mais carteiras
npm run miner -- --register <address2> <pubkey2> <signature2>
```

## Passo 4: Carregar no Dashboard

**Opção A: Via Página de Setup**
1. Acesse: http://localhost:3001/setup-wallets.html
2. Cole os dados das suas carteiras em JSON
3. Clique em "Salvar Carteiras"

**Opção B: Via Console do Navegador**
1. Acesse: http://localhost:3001
2. Abra o console (F12)
3. Cole este código (ajuste com seus dados):

```javascript
const wallets = [
  {
    id: "wallet-1",
    address: "SEU_ENDERECO_AQUI",
    pubkey: "SUA_PUBKEY_AQUI",
    registered: true
  }
];

localStorage.setItem('midnight-wallets', JSON.stringify(wallets));
location.reload();
```

## ✅ Pronto!

Agora você pode:
- Ver todas suas carteiras no dashboard
- Filtrar por status (Submitted/Pending)
- Ver estatísticas gerais
- Monitorar o desafio atual

## 📊 O que você verá:

- **Header**: Estatísticas gerais
- **Desafio Atual**: Informações do desafio ativo
- **Atividade Diária**: Grid com dias
- **Cards de Carteiras**: Uma para cada carteira registrada
  - ✅ **Submitted**: Carteira já enviou solução
  - ⏳ **Pending**: Carteira aguardando

## 🔄 Atualização Automática

O dashboard atualiza a cada 30 segundos automaticamente!

