# Como Fazer Funcionar a Solução

## ✅ O que já está implementado

1. ✅ Todos os endpoints da API conforme especificação
2. ✅ Validação de formato de entrada
3. ✅ Estrutura de armazenamento (em memória)
4. ✅ Configuração do AshMaize conforme documento (parâmetros corretos)
5. ⚠️ **Implementação do hash AshMaize está simulada** (precisa integração real)

## 🔧 Passos para Fazer Funcionar

### 1. Instalar Dependências

```bash
cd scavenger-api
npm install
```

### 2. Integrar AshMaize Real

**Opção A: Usar WASM (mais fácil)**

```bash
# Na pasta raiz do projeto
cd ce-ashmaize
wasm-pack build crates/ashmaize-web --target nodejs

# Voltar para a API
cd ../scavenger-api
npm install ../ce-ashmaize/crates/ashmaize-web/pkg
```

Depois, atualize `src/ashmaize/ashmaize.service.ts` para usar o WASM real. Veja `INTEGRACAO_ASHMAIZE.md` para detalhes.

**Opção B: Usar simulação (para testes)**

A implementação atual já funciona para testes, mas não valida corretamente as soluções. Use apenas para desenvolvimento/testes.

### 3. Configurar Validação Cardano (Opcional mas Recomendado)

Para validação real de assinaturas CIP-8/30:

```bash
npm install @cardano-foundation/cardano-message-signing
```

Atualize `src/cardano/cardano.service.ts` para usar a biblioteca real.

### 4. Iniciar o Servidor

```bash
npm run start:dev
```

O servidor estará rodando em `http://localhost:3000`

## 📋 Checklist de Funcionalidades

### ✅ Implementado e Funcionando

- [x] GET /TandC - Retorna termos e condições
- [x] GET /TandC/:version - Termos por versão
- [x] POST /register/:address/:signature/:pubkey - Registro de endereços
- [x] GET /challenge - Busca desafio atual
- [x] POST /solution/:address/:challenge_id/:nonce - Submissão de soluções
- [x] POST /donate_to/:destination/:original/:signature - Reatribuição
- [x] GET /work_to_star_rate - Taxa de trabalho STAR

### ⚠️ Implementado mas Precisa Integração Real

- [ ] **Validação AshMaize** - Atualmente simulada, precisa código Rust real
- [ ] **Validação Assinaturas Cardano** - Atualmente básica, precisa biblioteca CIP-8/30

### 📝 Configuração do AshMaize

Conforme documento, já configurado corretamente:

```typescript
{
  nbLoops: 8,              // ✅ Correto
  nbInstrs: 256,           // ✅ Correto
  preSize: 16777216,       // ✅ 16MB correto
  mixingNumbers: 4,        // ✅ Correto
  romSize: 1073741824,     // ✅ 1GB correto
}
```

**ROM inicializado com:** `no_pre_mine` (hex string do challenge) ✅

**Preimage construído como:** `nonce + address + challenge_id + difficulty + no_pre_mine + latest_submission + no_pre_mine_hour` ✅

## 🧪 Como Testar

### 1. Obter Termos e Condições

```bash
curl http://localhost:3000/TandC
```

### 2. Registrar Endereço (simulado)

```bash
# Por enquanto aceita qualquer assinatura válida em formato
curl -X POST http://localhost:3000/register/addr_test1q.../signature/pubkey
```

### 3. Buscar Desafio

```bash
curl http://localhost:3000/challenge
```

### 4. Submeter Solução

```bash
curl -X POST http://localhost:3000/solution/addr_test1q.../**D01C01/nonce1234567890
```

## 🚀 Próximos Passos Críticos

1. **Integrar AshMaize Real** - Ver `INTEGRACAO_ASHMAIZE.md`
2. **Implementar Validação Cardano Real** - Usar biblioteca oficial
3. **Adicionar Banco de Dados** - Para persistência (atualmente em memória)
4. **Adicionar Testes** - Unitários e E2E
5. **Configurar Produção** - Variáveis de ambiente, logs, etc.

## 📚 Documentação

- Especificação completa: `Midnight - Whitepaper treatment for Scavenger Mine API V3 (1).pdf`
- Integração AshMaize: `INTEGRACAO_ASHMAIZE.md`
- README: `README.md`

