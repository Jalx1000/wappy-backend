# ADR 001 — Schema-per-tenant en Postgres

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + architect

## Contexto

Wappy es multi-tenant. Necesitamos decidir el modelo de aislamiento de datos entre workspaces. Opciones consideradas:

1. **Shared-schema + `workspaceId` columna**: una sola DB, una sola DB schema, todas las tablas tienen `workspaceId` y queries filtran por él. Lo más simple operativamente.
2. **Schema-per-tenant**: una DB, múltiples schemas Postgres (`tenant_acme`, `tenant_globant`), cada workspace en su schema. `search_path` define qué schema ve cada request.
3. **Database-per-tenant**: una DB Postgres por workspace. Aislamiento máximo, complejidad operativa máxima.

El factor decisivo es que Wappy implementa **Custom Objects estilo Twenty CRM** ([[ADR-003]]) — cada workspace puede crear sus propias tablas (`orders`, `properties`, etc.) en runtime. Eso requiere que cada workspace tenga su propio "namespace" de tablas separado.

## Decisión

**Adoptamos schema-per-tenant**. Cada workspace tiene un schema Postgres dedicado (`tenant_{slug}`). Existe además un schema `core` global para tablas compartidas (workspaces, users, sessions, audit_log, plans).

### Detalles operativos

- **Resolución de schema por request**: `TenantContext` (basado en `AsyncLocalStorage`) guarda el `workspaceId` resuelto del subdominio. Un interceptor TypeORM hace `SET LOCAL search_path TO tenant_{slug}, public` al inicio de la transacción.
- **Creación de schema**: al crear un workspace, un job ejecuta `CREATE SCHEMA tenant_{slug}` + corre todas las migraciones del set `migrations/tenant/` en ese schema.
- **Migraciones**: dos sets independientes:
  - `migrations/core/`: corren una sola vez en el schema `core` (workspaces, users, etc.).
  - `migrations/tenant/`: corren una vez por cada workspace al crearse, y al hacer upgrade (cada workspace se versiona).
- **Custom Objects**: el motor de metadata ejecuta `CREATE TABLE tenant_{slug}.orders (...)` en runtime cuando el cliente define un object nuevo. Esto es seguro porque cada workspace solo afecta su propio schema.
- **Conexión pool**: una sola DataSource compartida. El `search_path` se setea per-request, no per-connection persistente.

## Consecuencias

### Positivas

- **Aislamiento físico**: imposible que una query mal escrita lea data de otro workspace. Postgres lo enforced a nivel de namespace.
- **Custom Objects naturales**: cada workspace tiene su zona de tablas, `CREATE TABLE` no choca con otro tenant.
- **Backup/restore por workspace**: `pg_dump --schema=tenant_acme` es trivial.
- **GDPR right-to-erasure**: `DROP SCHEMA tenant_acme CASCADE` borra todo del workspace en una sola operación.
- **Migración por workspace**: podemos aplicar cambios de schema gradualmente, workspace por workspace, sin downtime global.

### Negativas

- **Complejidad de migraciones**: dos sets, dos runners, dos ciclos de testing.
- **Conexión pool más complicada**: cada query setea `search_path`. Debug es más difícil — un query log sin el `SET search_path` no dice qué workspace fue.
- **Límite de Postgres**: Postgres maneja bien hasta ~10k schemas. Más allá hay que sharding (no problema para year 1, posiblemente sí para year 3).
- **Queries cross-workspace impossible**: reports admin que necesitan agregar across workspaces requieren queries especiales contra `pg_catalog` o tablas materializadas en `core`.
- **Refactor del repo actual**: el código existente asume shared-schema. Hay que reescribir el `BaseRepository` para schema-aware.
- **Connection limit**: cada conexión que cambia `search_path` no puede reutilizarse trivialmente para otro tenant en el siguiente request a menos que se resetee — el pooling necesita ser pgbouncer-aware o transaction-level.

### Mitigaciones

- **Connection pool**: usar `SET LOCAL search_path` dentro de transacciones (vuelve al default al commit/rollback). Esto permite reuso seguro de conexiones del pool.
- **Naming convention estricto**: `tenant_{slug}` siempre lowercase, kebab → underscore, max 50 chars (slug validado en signup).
- **Test e2e de aislamiento en cada sprint** que toque persistencia. QA paranoid: query desde workspace A intentando ver tabla de workspace B debe fallar.
- **Monitoring de count de schemas**: alerta cuando se llegue a 5,000 (mucho antes del límite).

## Referencias

- Twenty CRM hace exactamente esto: github.com/twentyhq/twenty (`packages/twenty-server/src/engine/twenty-orm/`).
- Citus, Postgres multi-tenancy patterns oficial.
- `pg_dump --schema` documentation.

## Notas de implementación

Ver `sprints/sprint-01-tenancy-schema.md` para la materialización.
