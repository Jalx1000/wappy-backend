# Sprint 01 — Tenancy schema-per-tenant + DDL engine

**Duración**: 2 semanas
**Objetivo**: Materializar [[ADR-001]]: cada workspace = un schema Postgres aparte. Sin lógica de negocio todavía; solo el motor de aislamiento + creación de schemas + dos sets de migraciones.
**Definition of Done del sprint**:
- CLI `npm run tenant:create -- --slug=acme` crea schema `tenant_acme` con todas las migraciones del set `tenant/` aplicadas.
- Request a `acme.wappy.dev/api/v1/_test/whoami` setea `search_path` a `tenant_acme` automáticamente.
- Test e2e demuestra aislamiento: query desde workspace A no ve data de workspace B aunque ataque con IDs conocidos.
- Documentación de los dos tipos de migraciones en CLAUDE.md.

**Demo al final**: crear 2 workspaces vía CLI, ver schemas en `\dn` de psql, ver search_path setearse en logs, fallar deliberadamente un cross-tenant query.

**Riesgos / dependencias externas**: ninguno externo. Riesgo interno alto: este es el sprint más fundamental.

**Referencias**: [[ADR-001]] (schema-per-tenant), [[ADR-002]] (TypeORM).

---

## Tareas

### [team-lead] WAPPY-01-01 — Kickoff + revisión ADR-001
- **Puntos**: 1
- **Depende de**: —
- **Descripción**: Re-leer ADR-001 con architect + backend. Confirmar plan. Identificar dudas pre-arranque.
- **Criterios de aceptación**: meeting realizado, dudas resueltas o registradas como tareas adicionales.

### [team-lead] WAPPY-01-13 — Demo + retro
- **Puntos**: 1
- **Depende de**: todas
- **Descripción**: Demo del DoD; retro.
- **Criterios de aceptación**: Video + notes guardadas.

### [architect] WAPPY-01-02 — Diseño detallado del TenantContext + TenantSchemaResolver
- **Puntos**: 3
- **Depende de**: WAPPY-01-01
- **Descripción**: Diseñar:
  - `TenantContext` basado en `AsyncLocalStorage` (Node built-in, no requiere lib externa).
  - `TenantResolverMiddleware`: lee Host header, parsea slug, lookup en `core.workspaces` (cacheable en Redis con TTL 60s), inyecta en context.
  - Fallback header `x-workspace-id` si no hay subdomain reconocible.
  - Decorator `@CurrentWorkspace()` (parameter decorator).
  - Cómo interceptar las queries TypeORM para setear `SET LOCAL search_path` en cada transacción.
- **Criterios de aceptación**:
  - [ ] Diseño documentado en `src/tenancy/README.md`.
  - [ ] Diagrama de secuencia: request HTTP → middleware → context → repo → query.
  - [ ] Decisión sobre dónde setear `search_path`: ¿interceptor de TypeORM? ¿extender Repository? Documentada con tradeoffs.

### [architect] WAPPY-01-03 — Diseño de la estrategia de dos sets de migraciones
- **Puntos**: 3
- **Depende de**: WAPPY-01-02
- **Descripción**: Definir:
  - Estructura de carpetas: `src/database/migrations/core/` y `src/database/migrations/tenant/`.
  - Naming convention (`YYYYMMDDHHmmss-Name.ts`).
  - Cómo se ejecutan: `npm run migration:run:core` corre core en schema `core`; `npm run migration:run:tenant -- --slug=acme` corre tenant en `tenant_acme`.
  - Cómo se sincronizan al crear workspace nuevo (corren todas las tenant en orden).
  - Versionado por tenant en tabla `core.tenant_migration_state` (workspaceId, lastMigrationName, appliedAt).
- **Criterios de aceptación**:
  - [ ] Diseño en `src/database/MIGRATIONS.md`.
  - [ ] Decisión documentada: ¿usar TypeORM CLI múltiple? ¿custom runner? Recomendación: custom runner Node script.

### [backend] WAPPY-01-04 — Implementar TenantContext + middleware
- **Puntos**: 5
- **Depende de**: WAPPY-01-02
- **Descripción**: Implementar:
  - `src/tenancy/tenant.context.ts` — wrapper sobre AsyncLocalStorage con getters/setters.
  - `src/tenancy/tenant-resolver.middleware.ts` — middleware Nest que resuelve slug del Host, busca workspace, setea context.
  - `src/tenancy/workspace.cache.ts` — cache slug→workspace en Redis con TTL 60s.
  - `src/tenancy/decorators/current-workspace.decorator.ts`.
  - Excepciones: `WorkspaceNotFoundException` (404), `WorkspaceSuspendedException` (402 si subscription suspended).
- **Criterios de aceptación**:
  - [ ] Middleware aplicado globalmente en `app.module.ts`.
  - [ ] Endpoint test `GET /api/v1/_test/whoami` devuelve `{ workspaceId, slug }` resuelto del Host.
  - [ ] Cache funciona (segunda request al mismo host no consulta DB; verificar en logs).
  - [ ] Tests unit de TenantContext + middleware.

### [backend] WAPPY-01-05 — Implementar SearchPathInterceptor
- **Puntos**: 5
- **Depende de**: WAPPY-01-04
- **Descripción**: Interceptor que envuelve cada request con transacción TypeORM y ejecuta `SET LOCAL search_path TO tenant_<slug>, public` al inicio. Investigar y elegir entre:
  - Subscriber TypeORM con `beforeQuery` hook.
  - Extender `Repository` base.
  - Middleware Express que abre transacción manual.
- **Criterios de aceptación**:
  - [ ] Recomendación elegida e implementada.
  - [ ] Verificable en logs Postgres (`log_statement=all` en dev): cada query precedida por `SET LOCAL search_path`.
  - [ ] Si no hay TenantContext seteado (ej. requests a `/health`), no aplica (default search_path = `public,core`).
  - [ ] Test e2e: dos requests concurrentes a workspaces distintos no se "mezclan" (race condition test).

### [backend] WAPPY-01-06 — Crear schema core + entidad Workspace + migration inicial
- **Puntos**: 3
- **Depende de**: WAPPY-01-03
- **Descripción**: Crear:
  - `src/workspaces/` con entidad TypeORM `Workspace` (id uuid, slug unique, name, createdAt, updatedAt) en schema `core`.
  - Migration `core/0000000000000-CreateCoreSchema.ts` que hace `CREATE SCHEMA IF NOT EXISTS core` y crea tabla `core.workspaces`.
  - Migration `core/0000000000001-CreateTenantMigrationState.ts` que crea `core.tenant_migration_state` (workspaceId, migrationName, appliedAt).
  - Service `WorkspacesService` con `findBySlug(slug)`, `create(name, slug)`, `delete(id)`.
- **Criterios de aceptación**:
  - [ ] Migrations corren con `npm run migration:run:core`.
  - [ ] `WorkspacesService.findBySlug('demo')` devuelve workspace o null.
  - [ ] Tests unit de `WorkspacesService`.

### [backend] WAPPY-01-07 — Implementar TenantSchemaManager (DDL operations)
- **Puntos**: 5
- **Depende de**: WAPPY-01-06
- **Descripción**: Service `TenantSchemaManager` con:
  - `createSchema(slug)` — `CREATE SCHEMA IF NOT EXISTS tenant_<slug>`.
  - `dropSchema(slug)` — `DROP SCHEMA tenant_<slug> CASCADE` (con safety check).
  - `runTenantMigrations(slug)` — itera migrations del set `tenant/`, las aplica al schema, actualiza `core.tenant_migration_state`.
  - `getPendingMigrations(slug)` — devuelve migrations no aplicadas todavía.
- **Criterios de aceptación**:
  - [ ] Idempotente: re-correr `runTenantMigrations` sobre schema ya migrado no falla.
  - [ ] Tests unit con DB de test.
  - [ ] Slug validation estricta: solo `[a-z0-9-]{3,50}`, no palabras reservadas Postgres.

### [backend] WAPPY-01-08 — CLI tenant:create + tenant:drop + tenant:migrate
- **Puntos**: 3
- **Depende de**: WAPPY-01-07
- **Descripción**: Scripts Node ejecutables:
  - `npm run tenant:create -- --slug=acme --name="Acme Corp"` → crea Workspace + schema + corre migrations.
  - `npm run tenant:drop -- --slug=acme --confirm=acme` → safety: pide confirmación.
  - `npm run tenant:migrate -- --slug=acme` → corre pending migrations.
  - `npm run tenant:migrate-all` → corre pending para todos los workspaces.
- **Criterios de aceptación**:
  - [ ] 4 scripts funcionando.
  - [ ] `npm run tenant:create -- --slug=acme` crea schema visible en `psql -c "\dn"`.
  - [ ] `npm run tenant:drop` sin `--confirm` o con slug incorrecto falla.

### [backend] WAPPY-01-09 — Migration tenant inicial (esquema base mínimo)
- **Puntos**: 2
- **Depende de**: WAPPY-01-08
- **Descripción**: Crear primera migration tenant `tenant/0000000000000-CreateTenantBase.ts`. Por ahora solo crea una tabla placeholder `_tenant_info (id, createdAt)` para verificar que el sistema funciona. Las tablas reales (contacts, conversations, members) se añaden en sprints posteriores.
- **Criterios de aceptación**:
  - [ ] Migration corre limpia.
  - [ ] Tabla aparece en cada schema tenant creado.

### [qa] WAPPY-01-10 — Tests e2e de aislamiento entre tenants
- **Puntos**: 5
- **Depende de**: WAPPY-01-09
- **Descripción**: Suite e2e que:
  - Crea 2 workspaces: `acme` y `globant`.
  - Inserta datos diferentes en cada (en la tabla `_tenant_info`).
  - Request a `acme.wappy.dev/api/v1/_test/list-tenant-info` solo ve data de acme.
  - Request a `globant.wappy.dev/api/v1/_test/list-tenant-info` solo ve data de globant.
  - Intenta deliberadamente acceder data de globant desde request de acme (ataque: pasar `?workspaceOverride=globant`) → debe fallar.
  - Race condition: 100 requests concurrentes alternando entre los 2 → ningún cross-leak en logs.
- **Criterios de aceptación**:
  - [ ] 4+ tests e2e pasando.
  - [ ] Test de race con 100 concurrent.
  - [ ] Documentar en README del sprint que estos tests son la **regression suite de aislamiento** y deben correr en cada CI.

### [devops] WAPPY-01-11 — Actualizar docker-compose con Postgres 17 + extensions
- **Puntos**: 2
- **Depende de**: —
- **Descripción**: Asegurar Postgres 17.x en compose (ya está). Habilitar extension `uuid-ossp` o `pgcrypto` para `gen_random_uuid()`. Setear `log_statement=all` solo en dev profile (no prod).
- **Criterios de aceptación**:
  - [ ] Postgres versión visible en `SELECT version()`.
  - [ ] `gen_random_uuid()` funciona.
  - [ ] Queries con `SET LOCAL search_path` visibles en logs dev.

### [cybersecurity] WAPPY-01-12 — Threat model del sistema de tenancy
- **Puntos**: 3
- **Depende de**: WAPPY-01-05
- **Descripción**: Documentar `planning/threat-models/01-tenancy.md` con:
  - Vectores de ataque: SQL injection en slug, race conditions, search_path bypass, cross-tenant via JWT mismatch.
  - Mitigaciones implementadas.
  - Lo que NO se mitiga todavía (será cubierto en sprints siguientes).
  - Tests de seguridad agregados.
- **Criterios de aceptación**:
  - [ ] Documento creado.
  - [ ] Al menos 5 vectores analizados.
  - [ ] Tests adversarios incluidos (slug injection: `' OR 1=1 --`).

---

## Métricas del sprint

| Métrica | Target |
|---|---|
| Total story points | 41 |
| Tareas paralelizables | 0 (alta cadena de dependencias arquitectónicas) |
| Tareas backend | 6 |
| Tareas architect | 2 |
| Tareas qa | 1 |
| Tareas devops | 1 |
| Tareas cybersecurity | 1 |
| Tareas team-lead | 2 |

## Notas

- Este es **el sprint más arriesgado del MVP**. Cualquier bug aquí compromete todo lo demás. Tests de aislamiento son **mandatory** y deben quedarse en CI permanentemente.
- Si el `SearchPathInterceptor` (WAPPY-01-05) se complica, considerar abrir tarea adicional para evaluar uso de `pg_session_jwt` o RLS Postgres en paralelo (no como reemplazo, como segunda capa).
- No tocar custom objects todavía. Esos vienen en S3-S6.
