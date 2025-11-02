# 🚀 Serviços Rodando!

## ✅ Status Atual

### API NestJS
- **Processo**: ✅ Rodando (PID visível nos processos)
- **Porta**: 3000
- **URL**: http://localhost:3000
- **Mineração Automática**: Iniciará automaticamente se `SEED_PHRASE` estiver configurada

### Frontend Next.js  
- **Processo**: ✅ Rodando (PID visível nos processos)
- **Porta**: 3001
- **URL**: http://localhost:3001
- **Status**: Compilando/Inicializando

## 📊 Como Verificar

### Ver Logs da API

Os processos estão rodando em background. Para ver os logs:

1. **Ver processos**:
   ```bash
   ps aux | grep -E "(nest|next)" | grep -v grep
   ```

2. **Verificar se API responde**:
   ```bash
   curl http://localhost:3000/challenge
   ```

3. **Verificar se Frontend responde**:
   ```bash
   curl http://localhost:3001
   ```

### O que você deve ver nos logs da API

Se a mineração automática iniciou corretamente, você verá:

```
🚀 Iniciando mineração automática...
📝 Derivando 50 endereços...
✅ 50 endereços derivados
📝 Registrando endereços...
✅ Endereço 1/50 registrado: addr1q...
✅ Endereço 2/50 registrado: addr1q...
...
✅ Todos os endereços registrados!
⛏️ Iniciando mineração...
🚀 50 workers de mineração iniciados!
```

## 🌐 Acessar Dashboard

Depois que o frontend terminar de compilar (pode levar 1-2 minutos):

**Acesse**: http://localhost:3001

Você verá:
- Estatísticas gerais
- Desafio atual
- Cards das carteiras minerando

## ⚠️ Se algo não estiver funcionando

1. **Verifique o arquivo `.env`** na pasta raiz
2. **Verifique os logs** dos processos
3. **Aguarde alguns segundos** - pode estar ainda inicializando

## 🎉 Próximos Passos

1. ✅ Serviços iniciados
2. ⏳ Aguardar mineração encontrar soluções
3. 📊 Monitorar no dashboard (http://localhost:3001)
4. 🔄 Ao final da campanha, clicar no botão de consolidação

**Tudo está rodando! Aguarde a compilação inicial e depois acesse o dashboard!** 🚀

