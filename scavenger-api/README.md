# Scavenger Mine API V3

API REST implementada em NestJS para o Scavenger Mine do Midnight, conforme especificação do whitepaper.

## 🚀 Funcionalidades

### Endpoints Implementados

1. **GET /TandC** - Retorna termos e condições
2. **GET /TandC/:version** - Retorna termos e condições por versão
3. **POST /register/:address/:signature/:pubkey** - Registra um endereço Cardano para participar
4. **GET /challenge** - Busca o desafio atual disponível
5. **POST /solution/:address/:challenge_id/:nonce** - Submete uma solução para um desafio
6. **POST /donate_to/:destination_address/:original_address/:signature** - Reatribui soluções entre endereços
7. **GET /work_to_star_rate** - Retorna a taxa de trabalho para STAR por dia

## 📦 Instalação

```bash
npm install
```

## 🔧 Desenvolvimento

```bash
npm run start:dev
```

A API estará rodando em `http://localhost:3000`

## 🏗️ Build

```bash
npm run build
npm run start:prod
```

## 📝 Estrutura do Projeto

```
src/
├── main.ts                 # Ponto de entrada da aplicação
├── app.module.ts           # Módulo principal
├── terms/                  # Termos e condições
├── register/               # Registro de endereços
├── challenge/              # Gerenciamento de desafios
├── solution/               # Submissão de soluções
├── donate/                 # Reatribuição de soluções
├── work-rate/              # Taxa de trabalho para STAR
├── storage/                # Serviço de armazenamento em memória
├── ashmaize/               # Integração com AshMaize
└── cardano/                # Validação de assinaturas Cardano
```

## ⚠️ Notas Importantes

### Validação de Assinaturas Cardano

A validação de assinaturas CIP-8/30 está implementada de forma simplificada. Para produção, recomenda-se usar uma biblioteca especializada como:
- `@cardano-foundation/cardano-message-signing`

### Validação AshMaize

A validação de hashes AshMaize está implementada de forma simplificada. Para produção, é necessário:
1. Compilar o código Rust do AshMaize para WASM
2. Integrar o WASM no serviço Node.js
3. Ou usar uma implementação nativa via FFI

### Armazenamento

Atualmente, o armazenamento é feito em memória (Map). Para produção, recomenda-se:
- Banco de dados (PostgreSQL, MongoDB, etc.)
- Cache distribuído (Redis)
- Persistência em disco

## 🔐 Configuração

Crie um arquivo `.env` para configurações:

```env
PORT=3000
NODE_ENV=development
```

## 📚 Documentação da API

Consulte o PDF `Midnight - Whitepaper treatment for Scavenger Mine API V3 (1).pdf` para detalhes completos da especificação da API.

## 🧪 Testes

```bash
npm test
npm run test:e2e
```

## 📄 Licença

MIT
