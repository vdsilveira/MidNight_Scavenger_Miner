# 📊 Status dos Serviços

## ✅ Serviços Iniciados

### API NestJS
- **URL**: http://localhost:3000
- **Status**: 🟢 Rodando
- **Mineração Automática**: ✅ Ativa (se SEED_PHRASE configurada)

### Frontend Next.js
- **URL**: http://localhost:3001
- **Status**: 🟢 Rodando

### AshMaize Binário
- **Localização**: `ce-ashmaize/target/debug/ashmaize-hash`
- **Status**: ✅ Compilado e pronto

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar API

```bash
curl http://localhost:3000/challenge
```

Deve retornar JSON com informações do desafio.

### 2. Verificar Mineração Automática

Os logs da API mostrarão:
- `📝 Derivando X endereços...`
- `✅ X endereços derivados`
- `📝 Registrando endereços...`
- `✅ Endereço X/Y registrado`
- `⛏️ Iniciando mineração...`
- `🚀 X workers de mineração iniciados!`

### 3. Verificar Frontend

Acesse: http://localhost:3001

Você deve ver o dashboard com:
- Estatísticas no topo
- Desafio atual
- Cards de carteiras (após registro)

## 🐛 Troubleshooting

### API não inicia mineração automática

Verifique:
1. Arquivo `.env` existe na pasta raiz
2. `SEED_PHRASE` está configurada
3. `AUTO_MINE=true`
4. Veja os logs da API para erros

### Frontend mostra "Nenhuma carteira"

1. Aguarde alguns segundos - os endereços são registrados automaticamente
2. Abra o console do navegador (F12) e verifique localStorage
3. Use a página de setup: http://localhost:3001/setup-wallets.html

## 📝 Logs Importantes

Quando tudo está funcionando, você verá nos logs da API:

```
🚀 Iniciando mineração automática...
📝 Derivando 50 endereços...
✅ 50 endereços derivados
📝 Registrando endereços...
✅ Endereço 1/50 registrado: addr1q...
...
✅ Todos os endereços registrados!
⛏️ Iniciando mineração...
🚀 50 workers de mineração iniciados!
```

## 🎯 Próximos Passos

1. ✅ Serviços rodando
2. ⏳ Aguardar mineração encontrar soluções
3. 📊 Monitorar no dashboard
4. 🔄 Ao final, usar botão de consolidação

