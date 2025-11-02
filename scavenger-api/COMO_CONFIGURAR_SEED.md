# 🔐 Como Configurar a Seed Phrase

## ⚠️ IMPORTANTE: Segurança

**NUNCA commite o arquivo `.env` no Git!** Ele contém sua seed phrase que dá acesso completo à sua carteira.

## 📝 Passo 1: Criar Arquivo .env

Na pasta raiz do projeto (`midnigth/`), crie ou edite o arquivo `.env`:

```bash
cd /l/disk0/viniciusd/Projetos/ambintes/midnigth
nano .env
```

## 📝 Passo 2: Adicionar Seed Phrase

Cole sua seed phrase (mnemonic) da carteira Eternl:

```env
# Sua seed phrase (24 palavras separadas por espaço)
SEED_PHRASE=word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24

# Endereço principal (será derivado automaticamente de m/1852'/1815'/0'/0/0)
# Você pode definir manualmente ou deixar vazio para derivar automaticamente
MAIN_ADDRESS=addr1qxemvvgh5hfedv26g2qd7mancmqpkhyq4frtd...j0jd7km30k0jlf5u9qvu5jyrj27xcmvz3v2qexg0ta

# Número de endereços para derivar e minerar
ADDRESS_COUNT=50

# Mineração automática ao iniciar (true/false)
AUTO_MINE=true
```

## 🔍 Passo 3: Verificar Formato

A seed phrase deve:
- Ter 24 palavras (ou 12, 15, 18, 21)
- Ser palavras válidas do BIP39
- Estar separadas por espaços

## 🚀 Passo 4: Iniciar Aplicação

Quando você iniciar a API:

```bash
cd scavenger-api
npm run start:dev
```

O sistema irá:
1. ✅ Ler a seed phrase do `.env`
2. ✅ Derivar os primeiros 50 endereços (m/1852'/1815'/0'/0/0 até /49)
3. ✅ Registrar todos automaticamente
4. ✅ Iniciar mineração para cada endereço

## 🔒 Segurança

### ✅ FAÇA:
- Mantenha o `.env` apenas local
- Use `.gitignore` para excluir `.env`
- Faça backup seguro da seed phrase (em papel, cofre, etc.)
- Nunca compartilhe sua seed phrase

### ❌ NÃO FAÇA:
- Commit do `.env` no Git
- Compartilhar seed phrase online
- Enviar por email/mensagem
- Deixar em texto aberto em repositórios

## 📊 Endereço Principal

O endereço principal será:
- **Caminho**: `m/1852'/1815'/0'/0/0`
- **Uso**: Receber todas as consolidações
- **Ação**: No final da campanha, todos os outros endereços doarão suas soluções para este

## 🔄 Como Funciona

1. **Derivação**: A seed phrase é usada para derivar 50 endereços sequenciais
2. **Registro**: Cada endereço é registrado automaticamente na API
3. **Mineração**: Cada endereço inicia a minerar em paralelo
4. **Consolidação**: Ao final, use o botão no frontend para consolidar tudo no endereço principal

## 🐛 Troubleshooting

### "Mnemonic inválido"
- Verifique se todas as palavras estão corretas
- Verifique se não há espaços extras
- Certifique-se de usar palavras válidas do BIP39

### "Endereços não derivados"
- Verifique se a seed phrase está correta
- Verifique os logs da aplicação
- Certifique-se de que `AUTO_MINE=true`

### "Endereços não aparecem no dashboard"
- Certifique-se de ter adicionado os endereços derivados ao localStorage
- Use a página de setup ou console do navegador

