# 🔧 Configuração para 2 Workers

Este documento explica como configurar o sistema para usar **2 workers simultâneos** com **ROM compartilhada**.

## ✅ Configuração no `.env`

Crie ou edite o arquivo `.env` na pasta raiz do projeto:

```env
# Seed Phrase da Carteira (24 palavras)
SEED_PHRASE=sua seed phrase aqui

# Endereço principal (opcional, será derivado automaticamente)
MAIN_ADDRESS=

# Número de endereços para minerar
ADDRESS_COUNT=50

# Mineração automática
AUTO_MINE=true

# ✅ CONFIGURAÇÃO DE WORKERS
# Máximo de workers simultâneos = 2
MAX_CONCURRENT_WORKERS=2

# Intervalo entre tentativas (ms)
# Com 2 workers, pode usar intervalo menor para mais velocidade
MINING_INTERVAL_MS=10

# Servidor
PORT=3000
NODE_ENV=development
```

## 🔄 Como Funciona a ROM Compartilhada

### ✅ ROM Única para Todos os Workers

1. **Todos os workers do mesmo desafio** usam o **mesmo `no_pre_mine`**
2. O `no_pre_mine` é gerado **deterministicamente** a partir do `challenge_id`
3. A **ROM é criada uma vez** e **cacheada** no serviço `AshmaizeWasmService`
4. Quando um worker precisa validar um hash:
   - Busca a ROM no cache
   - Se não existe, cria uma vez e cacheia
   - Todos os outros workers **reutilizam a mesma ROM**

### 📊 Exemplo com 2 Workers

- **2 workers** minerando o desafio `D01C10`
- Ambos usam o **mesmo `no_pre_mine`** (gerado de `D01C10`)
- **1 única ROM de 1GB** é criada e compartilhada
- **Memória total: 1GB** (não 2GB!)

## 🔍 Verificação dos Problemas Corrigidos

### ✅ Problema 1: Conversão do `no_pre_mine`

**Antes**: Conversão sem validação podia falhar silenciosamente

**Agora**:
- ✅ Validação de formato hex (64 caracteres)
- ✅ Validação de tamanho (32 bytes após conversão)
- ✅ Mensagens de erro claras

### ✅ Problema 2: ROM não Compartilhada

**Antes**: Cada worker criava sua própria ROM

**Agora**:
- ✅ Cache de ROM por `no_pre_mine`
- ✅ Reutilização automática entre workers
- ✅ Limpeza de ROMs expiradas

### ✅ Problema 3: Limpeza de ROMs

**Antes**: Função vazia (apenas log)

**Agora**:
- ✅ Remove ROMs de desafios expirados
- ✅ Mantém apenas ROM do desafio ativo
- ✅ Logs informativos sobre limpeza

### ✅ Problema 4: Validação de Difficulty

**Antes**: Validação básica sem tratamento de erros

**Agora**:
- ✅ Validação de formato
- ✅ Mensagens de erro claras
- ✅ Lógica corrigida para verificação de bits zero

## 🚀 Como Testar

1. **Configure o `.env`** com `MAX_CONCURRENT_WORKERS=2`
2. **Inicie a API**:
   ```bash
   cd scavenger-api
   npm run start:dev
   ```
3. **Verifique os logs**:
   - Deve ver: `⚙️  Configuração de mineração: 2 workers simultâneos`
   - Deve ver: `🔨 Building ROM for challenge...` (apenas uma vez)
   - Deve ver: `♻️  Reusing cached ROM...` (para workers subsequentes)

4. **Verifique o uso de memória**:
   - Com 2 workers, deve usar aproximadamente **1GB de RAM** (1 ROM compartilhada)
   - **NÃO** deve usar 2GB (2 ROMs separadas)

## 📋 Checklist de Verificação

- [ ] `.env` configurado com `MAX_CONCURRENT_WORKERS=2`
- [ ] API iniciada sem erros
- [ ] Log mostra "2 workers simultâneos"
- [ ] ROM criada apenas uma vez (log "Building ROM" aparece uma vez)
- [ ] Workers reutilizando ROM (log "Reusing cached ROM")
- [ ] Uso de memória ~1GB (não 2GB)
- [ ] Mineração funcionando (tentativas sendo processadas)

## 🐛 Troubleshooting

### ROM sendo criada múltiplas vezes

**Causa**: `no_pre_mine` diferente para cada worker

**Solução**: Verificar se `ChallengeService.generateNoPreMine()` está retornando o mesmo valor para o mesmo `challenge_id`

### Erro "Invalid no_pre_mine format"

**Causa**: `no_pre_mine` não tem 64 caracteres hex

**Solução**: Verificar se `ChallengeService.generateNoPreMine()` retorna SHA256 hex (64 chars)

### Workers não compartilhando ROM

**Causa**: Cada worker recebendo `no_pre_mine` diferente

**Solução**: Verificar se todos os workers obtêm o desafio do mesmo `ChallengeService.getCurrentChallenge()`

## 📝 Notas Importantes

1. **ROM é criada sob demanda**: Só é criada quando o primeiro worker precisa
2. **ROM é cacheada**: Reutilizada por todos os workers do mesmo desafio
3. **ROM é limpa automaticamente**: Quando o desafio muda, ROM antiga é removida
4. **1 ROM por desafio**: Apenas a ROM do desafio ativo fica em cache

