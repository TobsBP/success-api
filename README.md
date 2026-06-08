# API Boilerplate

Fastify 5 + TypeScript + Drizzle ORM + Firebase Auth

## Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Framework**: Fastify 5
- **ORM**: Drizzle ORM + PostgreSQL
- **Auth**: Firebase Admin (JWT)
- **Validation**: TypeBox
- **Docs**: Swagger + Scalar UI (`/docs`)
- **Linter**: Biome

## Setup

```bash
cp .env.example .env
# Preencha as variáveis de ambiente

npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Estrutura

```
src/
├── core/errors/        # AppError, NotFoundError, etc.
├── shared/schemas/     # Schemas TypeBox reutilizáveis
├── infra/
│   ├── db/             # Cliente Drizzle + schema
│   └── plugins/        # Error handler, Firebase Auth, Swagger
└── modules/
    └── users/          # Exemplo completo de módulo
        ├── schemas/
        ├── repositories/
        ├── services/
        ├── controllers/
        └── routes/
```

## Padrão de retorno

- **Sucesso**: objeto direto ou array
- **Erro**: `{ statusCode, error, message, details? }`
- **Paginado**: `{ data: [], meta: { total, page, limit, totalPages } }`

## Adicionando um novo módulo

1. Crie a pasta `src/modules/<nome>/`
2. Adicione schema Drizzle em `src/infra/db/schema/`
3. Implemente as 5 camadas: `schemas → repositories → services → controllers → routes`
4. Registre as rotas no `src/server.ts`

## Auth

Toda rota exige `Authorization: Bearer <firebase-token>` e `x-company-id: <uuid>`.

Para rotas públicas, use `config: { public: true }`.
Para rotas sem multi-tenancy, use `config: { tenancy: false }`.
