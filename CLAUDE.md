# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NestJS REST API boilerplate (forked from `brocoders/nestjs-boilerplate`) using **Hexagonal Architecture** to keep business logic independent of persistence. The upstream supports both TypeORM/PostgreSQL and Mongoose/MongoDB; this fork is currently configured **relational-only** — only `generate:resource:relational` / `add:property:to-relational` scripts remain in `package.json`, and the document generator templates under `.hygen/generate/*` are deleted on `main`.

## Common commands

```bash
# Dev
npm run start:dev                       # watch mode
npm run start:swc                       # watch with SWC (faster rebuild)
npm run start:debug
npm run lint -- --fix
npm run format

# Tests
npm test                                # unit (*.spec.ts under src/)
npm test -- path/to/file.spec.ts        # single unit test
npm run test:e2e                        # e2e (test/**/*.e2e-spec.ts)
npm run test:e2e:relational:docker      # full dockerized e2e against Postgres

# Database (TypeORM)
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run schema:drop
npm run seed:create:relational -- --name <Entity>
npm run seed:run:relational
```

`typeorm`, `migration:*`, and `test:e2e` are wrapped in `env-cmd` and load `.env` automatically. The migration data source is `src/database/data-source.ts`.

## Adding entities, schemas, or properties

Use the `generate` skill (auto-loaded from `.claude/skills/generate/SKILL.md`). It wraps the project's Hygen-based CLI generators (`npm run generate:resource:*`, `npm run add:property:to-*`), which produce the full Hexagonal module layout (domain, DTOs, ports, adapters, mappers) in sync. **Do not hand-write entity files** — the layout is generator-owned and easy to get subtly wrong.

Hard rules (also in the skill):
- Never generate `User` or `File` — they already exist; reference them in relationships instead.
- Never add `id`, `createdAt`, `updatedAt` — every entity gets them automatically.
- For `oneToMany`, only define it on the parent side. The generator emits the matching `manyToOne` on the child.
- For `File` relations, only `oneToOne` or `manyToMany` are supported.

After generating a relational entity, run `npm run migration:generate -- src/database/migrations/<Name>` to create the matching schema migration.

## Architecture

Each feature module (`src/<feature>/`) follows Hexagonal / Ports-and-Adapters:

```
<feature>/
├── domain/                                  # framework-agnostic domain objects
├── dto/                                     # HTTP boundary types (create/update/find-all)
├── infrastructure/persistence/
│   ├── <port>.repository.ts                 # abstract repository (the "port")
│   ├── relational/
│   │   ├── entities/                        # TypeORM entities (DB shape)
│   │   ├── mappers/                         # entity <-> domain
│   │   ├── repositories/                    # TypeORM adapter implementing the port
│   │   └── relational-persistence.module.ts
│   └── document/                            # (Mongoose mirror — not used in this fork)
├── <feature>.controller.ts
├── <feature>.service.ts                     # depends on the port, not the adapter
└── <feature>.module.ts                      # wires the persistence module of the active DB
```

Services depend on the abstract repository (`<port>.repository.ts`); the persistence sub-module binds it to a concrete adapter via NestJS DI. **Do not import TypeORM entities from services or controllers** — go through the port. Mappers are the only place where DB entities and domain objects meet.

Repository methods should be single-purpose (`findByEmail`, `findByIds`) rather than a universal `find(condition)` — see `docs/architecture.md` for the rationale.

## Config & cross-cutting modules

- `src/config/` + each feature's `config/*.config.ts` are registered in `app.module.ts` via `ConfigModule.forRoot({ load: [...] })`. `AllConfigType` (`src/config/config.type.ts`) is the typed accessor — use `configService.getOrThrow('app.x', { infer: true })`.
- TypeORM is wired through `TypeOrmConfigService` (`src/database/typeorm-config.service.ts`); migrations live in `src/database/migrations/`.
- i18n via `nestjs-i18n` resolves the locale from a request header; translation files live in `src/i18n/`.
- Auth: email/password + Facebook + Google (`src/auth`, `src/auth-facebook`, `src/auth-google`), session storage in `src/session`, JWT strategies in `src/auth/strategies`. Role/status enums live in `src/roles` and `src/statuses`.
- File uploads have local and S3 drivers behind a port in `src/files/infrastructure/uploader/`.

## Tests

- Unit tests: `*.spec.ts` colocated with source under `src/`; Jest config is inline in `package.json`.
- E2E tests: `test/**/*.e2e-spec.ts`, split into `test/admin/` and `test/user/`. They hit a real running API (default `http://localhost:3000`) — start the stack first (`docker-compose.relational.test.yaml` is what `test:e2e:relational:docker` uses) or use that wrapper script which builds the image, waits for the API, runs Jest inside the container, and tears down.

## Project layout

### System feature modules — Hygen-generated

Generated with `npm run generate:resource:relational` and `npm run add:property:to-relational`. These follow the Hexagonal layout described in [Architecture](#architecture) above. Examples already in the repo: `src/users/`, `src/files/`, `src/auth/`, `src/session/`.

**Do not hand-write these.** The generator owns the layout; hand-written files diverge silently.

### Wappy cross-cutting modules — hand-written, NOT Hygen-generated

These implement platform-wide concerns that span tenants or drive runtime behaviour. They do not follow the Hygen template because their shape is unique and load-bearing per the locked ADRs.

| Directory | Purpose |
| --- | --- |
| `src/tenancy/` | Schema-per-tenant (ADR-001): `TenantContext` via `AsyncLocalStorage`, `search_path` interceptor, DDL engine for tenant schema creation, TypeORM connection pool integration. |
| `src/metadata/` | Custom Objects runtime (ADR-003): `ObjectDefinition`, `FieldDefinition`, `RelationDefinition` — stored in `core` schema. Drives DDL operations (`CREATE TABLE`, `ALTER TABLE`) against each tenant schema. |
| `src/auto-api/` | Auto-API generator (ADR-004): reads metadata at boot and on every `metadata.changed` event, registers REST routes and GraphQL types dynamically in the Nest router. Contains `MetadataQueryService` (filter/sort/pagination engine) and OpenAPI per-workspace spec builder. |
| `src/module-registry/` | Per-workspace feature flags: tracks which modules (e.g., `calendar`, `bot-builder`, `campaigns`) are enabled for a given workspace/plan. Guards and resolvers consult it before dispatching to feature modules. |

Why separate from Hygen modules: each of these crosses the tenant boundary or drives runtime meta-behaviour that no single Hexagonal feature module can own. Their ports are at the application layer, not the persistence layer.

### BullMQ workers

`src/workers/` — long-running queue processors (BullMQ consumers). These are **not** NestJS feature modules: they are standalone processor classes registered with `BullModule`. They import domain services through ports; they never import TypeORM entities directly.

Naming: `src/workers/<queue-name>.processor.ts`.

### CLI scripts

`scripts/` — one-off dev utilities, seed runners, and migration helpers that run outside the NestJS application context (plain Node.js or `ts-node`). Examples: seed data for a fresh tenant, schema snapshot diffing, dev token generator.

These are **not** part of the application bundle. They may import domain types but never import NestJS modules or decorators.

### Naming conventions

| Construct | Convention | Example |
| --- | --- | --- |
| Classes / NestJS modules | PascalCase | `TenantContextService`, `AutoApiModule` |
| Files | kebab-case | `tenant-context.service.ts`, `auto-api.module.ts` |
| Repository ports | `*.port.ts` suffix | `metadata-object.repository.port.ts` |
| Persistence adapters | `*.adapter.ts` suffix | `metadata-object.typeorm.adapter.ts` |
| BullMQ processors | `*.processor.ts` suffix | `ddl-migration.processor.ts` |
| DTOs | `create-*.dto.ts`, `update-*.dto.ts` | `create-object-definition.dto.ts` |
| Domain objects | match the domain noun, no suffix | `ObjectDefinition`, `FieldDefinition` |
