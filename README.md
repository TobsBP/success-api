# API Boilerplate

Fastify 5 + TypeScript + Drizzle ORM + Firebase Auth

## Stack

- **Runtime**: Node.js 24 + TypeScript (ESM)
- **Framework**: Fastify 5
- **ORM**: Drizzle ORM + PostgreSQL
- **Cache**: Redis (opcional) via ioredis
- **Auth**: Firebase Admin (JWT)
- **Validation**: TypeBox
- **DI**: awilix
- **Docs**: Swagger + Scalar UI (`/docs`)
- **Observability**: Sentry (opcional) + health checks
- **Lint/Format**: Biome
- **Testes**: Vitest

## Setup

```bash
cp .env.example .env
# Preencha as variáveis de ambiente (FIREBASE_* e DATABASE_URL são obrigatórias)

docker compose up -d      # Postgres + Redis locais
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

A versão do Node é fixada em `.nvmrc` (24). Use `nvm use` para alinhar.

## Scripts

```bash
npm run dev               # servidor em watch (tsx)
npm run build             # tsc && tsc-alias -> dist/
npm start                 # roda dist/server.js (build antes)
npm run typecheck         # tsc --noEmit
npm run lint              # biome check --write .
npm test                  # vitest run
npm run test:coverage     # vitest com cobertura
npm run db:generate       # gera migração a partir do schema
npm run db:migrate        # aplica migrações
npm run generate:module <nome>   # scaffold de um módulo completo
```

## Estrutura

```
src/
├── core/
│   ├── config/         # env.ts (validação das envs no startup)
│   ├── di/             # container awilix
│   └── errors/         # AppError, NotFoundError, etc.
├── shared/schemas/     # Schemas TypeBox reutilizáveis
├── infra/
│   ├── db/             # cliente Drizzle + schema
│   ├── cache/          # cliente Redis + CacheService
│   ├── sentry.ts       # init do Sentry
│   └── plugins/        # error-handler, firebase-auth, health, swagger
└── modules/
    └── users/          # exemplo completo de módulo
        ├── schemas/
        ├── interfaces/
        ├── repositories/
        ├── services/
        ├── controllers/
        └── routes/
```

### Alias de imports

`@/*` aponta para `src/*`. Use `@/...` em vez de `../../` para imports entre áreas
(ex.: `import { NotFoundError } from "@/core/errors/index.js"`). O `.js` continua
obrigatório. Imports de irmãos da mesma pasta seguem relativos (`./foo.js`).

## Padrão de retorno

- **Sucesso**: objeto direto ou array
- **Erro**: `{ statusCode, error, message, details? }`
- **Paginado**: `{ data: [], meta: { total, page, limit, totalPages } }`

## Adicionando um novo módulo

Use o scaffolder — ele cria as camadas, os testes e registra o módulo
automaticamente no container de DI e no `src/modules/index.ts`:

```bash
npm run generate:module products
```

Depois, adicione a tabela Drizzle em `src/infra/db/schema/` e implemente as queries
do repositório (os métodos vêm como stub).

## Auth

Toda rota exige `Authorization: Bearer <firebase-token>`.

Para rotas públicas, use `config: { isPublic: true }`.

## Cache

`CacheService` (injetado via DI como `cache`) expõe `get`/`set`/`del` com
serialização JSON. Sem `REDIS_URL` configurado, vira no-op (sempre cache miss),
então a app roda sem Redis. Veja o padrão cache-aside em `UsersService`.

## Health checks

- `GET /health` — liveness (processo de pé).
- `GET /ready` — readiness (ping em DB e Redis; 503 se uma dependência obrigatória cair).

## Rate limit

Global via `@fastify/rate-limit`, configurável por `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW`.
