# 📚 Explicação sobre o ROM (Read Only Memory)

## O que é o ROM?

O **ROM** é uma memória de **1GB de dados aleatórios** usada pelo algoritmo AshMaize para calcular hashes. É como uma "tabela de consulta gigante" que torna o algoritmo resistente a ASICs.

### Características:

1. **Tamanho**: 1GB de dados aleatórios
2. **Geração**: Criado determinísticamente a partir do `no_pre_mine` (seed)
3. **Uso**: Acessado aleatoriamente durante o cálculo do hash
4. **Propósito**: Aumenta a dificuldade de implementar em hardware especializado (ASIC)

## 🔄 Compartilhamento da ROM

### ✅ SIM! Todos os workers compartilham a mesma ROM!

**Como funciona:**

1. Todos os workers do mesmo desafio usam o mesmo `no_pre_mine`
2. O `no_pre_mine` é gerado determinísticamente a partir do `challenge_id`
3. A ROM é cacheada por `no_pre_mine` no serviço `AshmaizeWasmService`
4. Quando um worker precisa validar um hash, busca a ROM do cache
5. Se a ROM não existe, cria uma vez e cacheia para todos usarem

**Exemplo:**
- 25 workers minerando o desafio `D01C10`
- Todos usam o mesmo `no_pre_mine` (gerado de `D01C10`)
- **1 única ROM de 1GB** é criada e compartilhada
- Memória total: **1GB** (não 25GB!)

### ⚠️ Problema Corrigido:

Antes estávamos gerando `no_pre_mine` aleatoriamente a cada chamada, o que causava:
- Múltiplas ROMs sendo criadas desnecessariamente
- Alto consumo de memória
- Falhas no WASM

**Agora:** `no_pre_mine` é determinístico baseado no `challenge_id`, garantindo:
- ✅ Uma única ROM por desafio
- ✅ Compartilhamento entre todos os workers
- ✅ Limpeza automática quando desafio expira

## 🗑️ Limpeza Automática

O sistema agora limpa automaticamente ROMs de desafios expirados:

1. **Durante mineração**: A cada iteração, remove ROMs que não são do desafio ativo
2. **Após expiração**: Quando um desafio termina, sua ROM é removida do cache
3. **Resultado**: Apenas 1 ROM em cache por vez (do desafio ativo)

## 💡 Por que não usar uma ROM fixa?

**Não pode!** O ROM é parte essencial do algoritmo:

1. **Segurança**: O `no_pre_mine` muda a cada desafio para evitar pré-computação
2. **Validação**: A API verifica se o hash foi calculado com o ROM correto
3. **Especificação**: O documento exige que cada desafio tenha seu próprio `no_pre_mine`

**Mas podemos:**
- ✅ Compartilhar ROM entre workers do mesmo desafio
- ✅ Limpar ROM quando desafio expira
- ✅ Manter apenas ROM do desafio ativo em memória

## 📊 Eficiência Atual

**Antes (Problema)**:
- Cada worker criava sua própria ROM = 25GB RAM

**Agora (Otimizado)**:
- 1 ROM compartilhada entre todos = 1GB RAM total
- Limpeza automática = apenas ROM do desafio ativo
- **Redução de 96% no uso de memória!**

