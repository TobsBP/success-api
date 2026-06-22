# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Fastify 5 + TypeScript (ESM) · Drizzle ORM + PostgreSQL · Firebase Admin (JWT auth) · TypeBox validation · awilix DI · Biome · Vitest.

Note: ESM is enforced (`"type": "module"`). All relative imports **must** use the `.js` extension even when importing `.ts` files (e.g. `import { x } from "./foo.js"`).

## Commands

```bash
npm run dev               # tsx watch src/server.ts (hot reload)
npm run build             # tsc -> dist/
npm start                 # node dist/server.js (run build first)
npm run lint              # biome check --write . (format + lint + organize imports)
npm test                  # vitest run
npm run test:watch        # vitest watch
npm run test:coverage     # vitest with v8 coverage
npx vitest run src/modules/users/services/users.service.test.ts   # single test file

npm run db:generate       # drizzle-kit generate (create migration from schema)
npm run db:migrate        # drizzle-kit migrate (apply migrations)
npm run generate:module products   # scaffold a full module (see below)
```

A pre-commit hook (husky + lint-staged) runs `biome check --write` on staged `src/**/*.ts`.

## Architecture

Modular layered architecture. Each feature lives in `src/modules/<name>/` and is split into 5 layers, wired together by an awilix DI container:

```
schemas → repositories → services → controllers → routes
```

- **schemas/** — TypeBox schemas + derived TS types (`Static<typeof X>`). Schemas are reused for both Fastify request/response validation AND as the source of DTO types.
- **repositories/** — Drizzle queries only. Maps PG errors to domain errors (e.g. unique-violation code `23505` → `ConflictError`). Constructor takes `{ db }`.
- **services/** — Business logic, throws domain errors from `core/errors`. Constructor takes `{ <name>Repository }`.
- **controllers/** — Thin Fastify handlers; arrow-function class methods (so `this` binds for `container.resolve`). Constructor takes `{ <name>Service }`.
- **routes/** — Resolves the controller from the container and registers routes with their schemas.
- **interfaces/** — `I<Name>Repository` / `I<Name>Service` contracts used for typing and test mocks.

### Dependency injection (awilix)

`src/core/di/container.ts` uses `InjectionMode.PROXY` — dependencies are injected as a single destructured object (`constructor({ db, usersRepository })`), so the property name in `container.register({...})` must match the constructor parameter name. All services/repos/controllers are `.singleton()`. `setupContainer()` is called once in `bootstrap()` before routes register.

### Request lifecycle / plugins

`src/server.ts` registers, in order: cors, helmet, swagger, error-handler, firebase-auth, then `appModules`. Plugins live in `src/infra/plugins/` and use `fastify-plugin` (`fp`) to escape encapsulation.

- **firebase-auth.plugin.ts** — `onRequest` hook on every route. Verifies the `Bearer` Firebase token, looks up the user by email in the DB, and populates `request.authUser`. Opt out per-route via `config: { isPublic: true }` (skip auth entirely). `/docs` and `/openapi.json` are always public.
- **error-handler.plugin.ts** — central error handler. `AppError` subclasses → their `statusCode`/`code`; Fastify validation errors → 400 `VALIDATION_ERROR`; everything else → 500.

### Errors

Use the typed errors in `src/core/errors/index.ts` (`AppError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`). Throw them from services/repositories — the error-handler plugin formats the response. Never hand-build error responses in handlers.

### Response conventions

- Success: the object or array directly.
- Paginated: `{ data: [], meta: { total, page, limit, totalPages } }` (see `users.service.ts` `list`).
- Error: `{ statusCode, error, message, details? }`.

### Database

`src/infra/db/client.ts` lazily creates a singleton `pg` Pool + Drizzle instance (`getDb()`); `closeDb()` is called on graceful shutdown. Drizzle schema lives in `src/infra/db/schema/`; after editing it run `db:generate` then `db:migrate`. `Db` type is exported from the client for typing repositories.

### Config

`src/core/config/env.ts` validates `process.env` against a TypeBox schema at startup and **exits the process** on missing/invalid vars. Add new env vars to this schema rather than reading `process.env` directly elsewhere.

## Adding a module

Prefer the scaffolder: `npm run generate:module <name>` (plural, e.g. `products`). It generates all 5 layers + interfaces + a service test + a routes test, and **auto-registers** the module in both `src/modules/index.ts` (route registration) and `src/core/di/container.ts` (DI). The generated repository methods are stubs — fill in the Drizzle queries and add the Drizzle table to `src/infra/db/schema/`. Singular/plural and capitalization are derived from the name automatically.

## Testing

Vitest with globals enabled. Unit tests sit next to the code (`*.test.ts`). Pattern: instantiate the class directly, passing a mock of the awilix-injected dependency object (`new UsersService({ usersRepository: mock })`), cast via `as unknown as IUsersRepository`. Route tests use `Fastify()` + `fastify.inject()` with a controller built from a mock service. `e2e/` is excluded from the default run.

## Conventions

- Biome formats with **tabs** and double quotes; let `npm run lint` fix style rather than hand-formatting.
- Comments and scaffolder output are in Portuguese; the existing code mixes Portuguese comments with English identifiers — follow the surrounding file.
