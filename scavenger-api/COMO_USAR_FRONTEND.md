# Como Usar o Frontend - Midnight Miner Dashboard

## 🚀 Iniciar o Frontend

### 1. Instalar dependências (já feito)
```bash
cd frontend
npm install
```

### 2. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

Acesse: **http://localhost:3001**

## 📝 Carregar Carteiras no Dashboard

### Opção 1: Usar localStorage (Manual)

1. **Registre suas carteiras** usando a CLI:
   ```bash
   cd ..
   npm run miner -- --register <address> <pubkey> <signature>
   npm run miner -- --list  # Ver todas registradas
   ```

2. **Abra o console do navegador** (F12) no dashboard

3. **Cole este código** (ajuste os endereços):

```javascript
const wallets = [
  {
    id: "wallet-1",
    address: "addr1qxxx...",  // Substitua pelo seu endereço
    pubkey: "009236f53f5fbb1056defb64d623f7508bc1b61822016d43faf62070f1489ff5",
    registered: true
  },
  {
    id: "wallet-2", 
    address: "addr1qyyy...",  // Segundo endereço
    pubkey: "009236f53f5fbb1056defb64d623f7508bc1b61822016d43faf62070f1489ff6",
    registered: true
  }
  // Adicione mais carteiras...
];

localStorage.setItem('midnight-wallets', JSON.stringify(wallets));
location.reload();
```

### Opção 2: Script Automático (Futuro)

Execute:
```bash
npm run sync-wallets
```

E siga as instruções no console.

## 🎨 Funcionalidades do Dashboard

### Estatísticas no Topo
- **Wallets**: Total de carteiras registradas
- **Submissions**: Total de soluções submetidas
- **NIGHT Earned**: Total de NIGHT ganhos
- **Status**: Conexão com a API

### Desafio Atual
- **Challenge ID**: ID do desafio atual
- **Difficulty**: Dificuldade do desafio
- **Submitted/Pending**: Número de soluções
- **Next Challenge**: Tempo até próximo desafio

### Carteiras
Cada card mostra:
- ✅ **Status**: Submitted (verde) ou Pending (laranja)
- 📍 **Endereço**: Endereço Cardano completo
- 📊 **Total Submissions**: Quantas soluções foram encontradas
- 💰 **NIGHT Earned**: NIGHT ganhos por esta carteira
- 🕐 **Last Submission**: Data/hora da última submissão

### Filtros
- **Submitted**: Apenas carteiras que já enviaram
- **Pending**: Apenas carteiras aguardando
- **All**: Todas as carteiras

## 🔄 Atualização Automática

O dashboard atualiza automaticamente a cada **30 segundos**:
- Busca novo desafio
- Atualiza estatísticas
- Atualiza status das carteiras

## 📊 Como Funciona

1. **Frontend lê carteiras** do `localStorage`
2. **Verifica status** de cada carteira
3. **Calcula estatísticas** automaticamente
4. **Exibe cards** com informações visuais

## 🐛 Troubleshooting

### "Nenhuma carteira registrada"
- Certifique-se de ter registrado carteiras via CLI
- Verifique o localStorage no console do navegador
- Execute o código JavaScript acima para adicionar manualmente

### "Status: Disconnected"
- Verifique se a API está rodando: `npm run start:dev` (na pasta raiz)
- Confirme que a URL está correta em `.env.local`
- Verifique CORS no servidor

### Carteiras não aparecem
- Abra o console do navegador (F12)
- Verifique se há erros
- Execute: `localStorage.getItem('midnight-wallets')` para ver o que está salvo

## 🔮 Próximas Melhorias

- [ ] API endpoint completo para carteiras
- [ ] Sincronização automática
- [ ] Histórico detalhado
- [ ] Gráficos de performance
- [ ] Exportação de relatórios

