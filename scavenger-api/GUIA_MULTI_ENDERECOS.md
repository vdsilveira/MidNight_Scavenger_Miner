# Guia: Mineração com Múltiplos Endereços Cardano

Este guia explica como usar múltiplos endereços da sua carteira Cardano para participar do Scavenger Mine.

## 📋 Visão Geral

Você pode:
1. **Registrar múltiplos endereços** - Cada endereço pode minerar independentemente
2. **Minerar em paralelo** - Usar vários endereços simultaneamente aumenta suas chances
3. **Consolidar soluções** - Juntar todas as soluções em um único endereço para simplificar o gerenciamento

## 🚀 Passo a Passo

### 1. Registrar Múltiplos Endereços

Para cada endereço que deseja usar:

```bash
npm run miner -- --register <address> <pubkey> <signature>
```

**Como obter a assinatura:**
1. Obter a mensagem dos termos:
   ```bash
   curl http://localhost:3000/TandC
   ```
2. Assinar a mensagem com sua carteira Cardano (Lace, Nami, Eternl, etc.)
3. Use a assinatura no comando de registro

**Exemplo:**
```bash
# Registrar primeiro endereço
npm run miner -- --register \
  addr1qxxx... \
  009236f53f5fbb1056defb64d623f7508bc1b61822016d43faf62070f1489ff5 \
  845882a30127045839001c2e057143337716055394074256b79df7fc36051...

# Registrar segundo endereço
npm run miner -- --register \
  addr1qyyy... \
  009236f53f5fbb1056defb64d623f7508bc1b61822016d43faf62070f1489ff6 \
  845882a30127045839001c2e057143337716055394074256b79df7fc36051...
```

### 2. Listar Endereços Registrados

```bash
npm run miner -- --list
```

Isso mostra todos os endereços registrados e quantas soluções cada um encontrou.

### 3. Obter Desafio Atual

```bash
npm run miner -- --challenge
```

### 4. Mineração com Múltiplos Endereços

```bash
npm run multi-miner -- --start <address1> <address2> <address3> ...
```

**Exemplo:**
```bash
npm run multi-miner -- --start \
  addr1qxxx... \
  addr1qyyy... \
  addr1qzzz...
```

Isso inicia workers de mineração para cada endereço em paralelo.

### 5. Consolidar Soluções

Depois de minerar com múltiplos endereços, você pode consolidar todas as soluções em um único endereço:

```bash
npm run multi-miner -- --consolidate-all <target_address>
```

Isso mostra as mensagens que você precisa assinar com cada endereço original.

**Processo:**
1. Execute o comando acima
2. Para cada endereço, você verá uma mensagem como:
   ```
   "Assign accumulated Scavenger rights to: addr1qtarget..."
   ```
3. Assine essa mensagem com o endereço original usando sua carteira Cardano
4. Execute o comando de consolidação:

```bash
npm run miner -- --consolidate <original_address> <target_address> <signature>
```

## 📝 Exemplo Completo

```bash
# 1. Registrar 3 endereços
npm run miner -- --register addr1q... pubkey1... sig1...
npm run miner -- --register addr1q... pubkey2... sig2...
npm run miner -- --register addr1q... pubkey3... sig3...

# 2. Verificar registros
npm run miner -- --list

# 3. Ver desafio atual
npm run miner -- --challenge

# 4. Iniciar mineração com os 3 endereços
npm run multi-miner -- --start \
  addr1qendereco1... \
  addr1qendereco2... \
  addr1qendereco3...

# 5. Depois de minerar, consolidar tudo no primeiro endereço
npm run multi-miner -- --consolidate-all addr1qendereco1...

# 6. Para cada endereço (2 e 3), assinar a mensagem e executar:
npm run miner -- --consolidate addr1qendereco2... addr1qendereco1... signature2...
npm run miner -- --consolidate addr1qendereco3... addr1qendereco1... signature3...
```

## 🎯 Benefícios de Usar Múltiplos Endereços

1. **Aumenta chances** - Mais endereços = mais tentativas de encontrar soluções
2. **Paralelização** - Minerar em paralelo é mais eficiente
3. **Organização** - Você pode usar diferentes dispositivos/máquinas
4. **Consolidação** - Depois, juntar tudo em um único endereço simplifica o gerenciamento

## ⚠️ Importante

1. **Assinaturas Cardano** - Você precisa assinar as mensagens com sua carteira real
2. **Prazo** - Todas as soluções devem ser submetidas antes de `latest_submission`
3. **Registro** - Cada endereço deve ser registrado antes de minerar
4. **Consolidação** - Você pode consolidar a qualquer momento durante e até 24h após o período de mineração

## 🔧 Configuração Avançada

### Usar API de Produção

```bash
export API_URL=https://scavenger.prod.gd.midnighttge.io
npm run miner -- --list
```

### Aumentar Workers

Edite `multi-address-miner.ts` e ajuste `workers` no `MiningConfig`:

```typescript
const config: MiningConfig = {
  addresses,
  workers: 4, // Mais workers = mais processamento paralelo
};
```

## 📚 Próximos Passos

1. Implementar cálculo AshMaize real no minerador
2. Adicionar suporte para carteiras Cardano (Lace, Nami)
3. Criar interface web para gerenciamento
4. Adicionar estatísticas e monitoramento

## 🆘 Troubleshooting

**Erro: "Address not registered"**
- Certifique-se de registrar o endereço primeiro com `--register`

**Erro: "Challenge not found"**
- Verifique se o período de mineração está ativo com `--challenge`

**Erro: "Invalid signature"**
- Certifique-se de assinar a mensagem exata retornada por `/TandC`
- Use a chave pública correta (64 caracteres hex)

**Mineração muito lenta**
- A inicialização do ROM AshMaize demora ~30-60 segundos
- Isso é normal conforme a especificação (ROM de 1GB)

