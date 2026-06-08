# Sprint 03 — Metadata Engine: Objects + Fields

**Duración**: 2 semanas
**Objetivo**: Arrancar el corazón Twenty-style. Cliente puede crear objects con fields y la DDL real se ejecuta en su schema tenant. 12 tipos de field soportados. Cooldown 30d antes de drop column real.
**Definition of Done del sprint**:
- API `POST /api/v1/_meta/objects` crea object → ejecuta `CREATE TABLE tenant_<slug>.<plural>(...)`.
- API `POST /api/v1/_meta/objects/:key/fields` añade field → `ALTER TABLE ... ADD COLUMN ...`.
- API `DELETE /api/v1/_meta/objects/:key/fields/:fieldKey` marca soft-delete con cooldown.
- 12 tipos de field funcionan con tipos Postgres correctos + índices automáticos.
- Audit log de cada DDL.
- Tests adversarios (SQL injection, naming) pasan.

**Demo**: vía REST crear object "Order" con fields name, total (currency), status (select); ver tabla en `psql`; añadir field "notes"; verificar `ALTER`; borrar field; verificar `_deleted_at` seteado pero columna sigue.

**Riesgos**: alto. DDL runtime es la operación más arriesgada del MVP ([[ADR-003]]). QA + cybersecurity intensos.

**Referencias**: [[ADR-003]] (real columns), [[ADR-004]] (auto-API).

---

## Tareas

### [team-lead] WAPPY-03-01 — Kickoff + risk review
- **Puntos**: 1
- **Descripción**: Re-leer ADR-003 con architect + backend + qa + cybersecurity. Asegurar que todos entienden la apuesta y los riesgos.

### [team-lead] WAPPY-03-15 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-03-02 — Diseño del Metadata schema (objects, fields)
- **Puntos**: 5
- **Depende de**: WAPPY-03-01
- **Descripción**: Diseñar el modelo de metadata:
  - `ObjectDefinition` (en tenant schema, tabla `_meta_objects`): id, key, label, pluralKey, icon, tier (`system|custom`), createdAt, updatedAt.
  - `FieldDefinition` (`_meta_fields`): id, objectDefinitionId, key, label, type, options (jsonb), isRequired, isUnique, isSearchable, defaultValue (jsonb), order, createdAt, updatedAt, deletedAt (nullable, marca cooldown).
  - Por qué en tenant schema y no en core: las definiciones son del workspace, viajan con el tenant en backup/restore.
  - Mapping tipo de field → tipo Postgres + constraint + índice.
  - Reglas de naming: key snake_case, ≤50 chars, no reservadas SQL.
- **Criterios de aceptación**:
  - [ ] Doc `src/metadata/SCHEMA.md` con diagrama.
  - [ ] Tabla de mapping field type → Postgres type + constraint completa para los 12 tipos.

### [architect] WAPPY-03-03 — Diseño del DDL generator (seguridad y atomicidad)
- **Puntos**: 5
- **Depende de**: WAPPY-03-02
- **Descripción**: Diseñar:
  - Service `DdlGenerator` que recibe metadata + intent y produce SQL exacto.
  - Lock pesimista por workspace mientras DDL corre (Redis lock con TTL 30s, retry).
  - Transaccional siempre: SQL DDL + INSERT en `_meta_objects` en misma TX.
  - Dry-run mode (genera SQL sin ejecutar) para validación.
  - Audit: cada operación DDL escribe a `_meta_audit_log` (objectKey, action, sql, executedBy, executedAt, durationMs, success).
  - Error handling: falla limpia, no estado inconsistente.
- **Criterios de aceptación**:
  - [ ] Doc `src/metadata/DDL_GENERATOR.md`.
  - [ ] Pseudocódigo del flujo create/alter/drop con locks + transaction.

### [backend] WAPPY-03-04 — Migration tenant: tablas _meta_*
- **Puntos**: 2
- **Depende de**: WAPPY-03-02
- **Descripción**: Crear migration `tenant/0000000000010-CreateMetaTables.ts` que crea:
  - `_meta_objects`
  - `_meta_fields`
  - `_meta_relations` (placeholder, se usa en S4)
  - `_meta_audit_log`
- **Criterios de aceptación**:
  - [ ] Migration corre limpia en workspaces nuevos.
  - [ ] Re-correr en workspace existente aplica solo lo pendiente.

### [backend] WAPPY-03-05 — Service MetadataService (CRUD objects)
- **Puntos**: 5
- **Depende de**: WAPPY-03-04
- **Descripción**: `MetadataService` con:
  - `createObject({ key, label, icon })` → valida, llama `DdlGenerator.createTable`, inserta en `_meta_objects`, refresca cache.
  - `getObject(key)`.
  - `listObjects()`.
  - `updateObject(key, { label, icon })`.
  - `deleteObject(key)` — soft delete (marca deletedAt + cooldown). DROP TABLE real lo hace un cron en S21.
  - Cache LRU por tenant (invalida en cambios).
  - Validaciones: key formato, no duplicado, no reservada.
- **Criterios de aceptación**:
  - [ ] Tests unit + integration con DB de test.
  - [ ] Race condition test: 2 creates concurrentes del mismo key → uno gana, otro 409.

### [backend] WAPPY-03-06 — DdlGenerator: createTable + alterAddColumn + alterDropColumn
- **Puntos**: 8
- **Depende de**: WAPPY-03-03, WAPPY-03-05
- **Descripción**: Implementar:
  - `createTable(objectKey, fields[])` → genera y ejecuta `CREATE TABLE tenant_<slug>.<plural> (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_by_id uuid, <fields>...)`.
  - `alterAddColumn(objectKey, fieldDef)` → `ALTER TABLE ... ADD COLUMN ... DEFAULT ...`.
  - `alterRenameColumn(objectKey, fromKey, toKey)`.
  - `alterDropColumn(objectKey, fieldKey)` → soft-delete; cron real en S21.
  - Mapping completo de tipos.
  - Sanitization de identifiers (lib `pg-format` o similar).
  - Lock Redis + transacción siempre.
  - Audit log entry siempre.
- **Criterios de aceptación**:
  - [ ] Los 12 tipos generan SQL correcto.
  - [ ] Tests unit que validan SQL generado (snapshot tests).
  - [ ] Tests integration que ejecutan contra DB real.
  - [ ] Tests adversarios: keys con `'; DROP TABLE foo --` → rechazados.

### [backend] WAPPY-03-07 — Service MetadataService (CRUD fields)
- **Puntos**: 5
- **Depende de**: WAPPY-03-06
- **Descripción**: Extender `MetadataService`:
  - `addField(objectKey, { key, label, type, options, isRequired, isUnique, isSearchable, defaultValue })`.
  - `renameField(objectKey, fromKey, toKey)`.
  - `updateField(objectKey, fieldKey, partial)` — soporta label, options, required (con check de data existente).
  - `removeField(objectKey, fieldKey)` — soft-delete.
  - Defaults computados: `currentUser`, `now`, valores literales.
  - Validation: tipo válido, default coherente con tipo, options coherente con tipo (ej: select tiene `choices: string[]`).
- **Criterios de aceptación**:
  - [ ] Tests unit + integration.
  - [ ] Default `currentUser` → cuando se inserta row sin valor, llena con member del context.

### [backend] WAPPY-03-08 — Controllers REST /_meta/objects + /_meta/fields
- **Puntos**: 3
- **Depende de**: WAPPY-03-07
- **Descripción**: Controllers protegidos por `@RequireModule('metadata')` (siempre core enabled) + `@Roles('Admin')`:
  - `GET /api/v1/_meta/objects`
  - `POST /api/v1/_meta/objects`
  - `GET /api/v1/_meta/objects/:key`
  - `PATCH /api/v1/_meta/objects/:key`
  - `DELETE /api/v1/_meta/objects/:key`
  - `POST /api/v1/_meta/objects/:key/fields`
  - `PATCH /api/v1/_meta/objects/:key/fields/:fieldKey`
  - `DELETE /api/v1/_meta/objects/:key/fields/:fieldKey`
  - `GET /api/v1/_meta/audit-log?objectKey=...`
- **Criterios de aceptación**:
  - [ ] 9 endpoints documentados en Swagger.
  - [ ] Tests e2e cubren happy paths + errores.

### [backend] WAPPY-03-09 — Seed: pre-crear objects sistema (Contact, Conversation, Message, Member, Event, Tag)
- **Puntos**: 3
- **Depende de**: WAPPY-03-07
- **Descripción**: En el flujo de creación de workspace, después de tenant migrations, sembrar objects sistema vía `MetadataService.createObject`. Estos NO son tablas creadas por el motor metadata — son tablas que existen como TypeORM entities pero también se registran en `_meta_objects` con `tier='system'` para que aparezcan en GraphQL/REST con el resto.
- **Criterios de aceptación**:
  - [ ] Workspace nuevo tiene 6 entradas en `_meta_objects` con tier=system.
  - [ ] Los fields sistema (name, email, etc.) también registrados en `_meta_fields`.
  - [ ] Mark especial: `isSystem=true` para que no se puedan editar/borrar.

### [qa] WAPPY-03-10 — Tests adversarios del DDL generator
- **Puntos**: 5
- **Depende de**: WAPPY-03-06
- **Descripción**: Tests específicos de seguridad:
  - Object key con SQL injection → rechazado en validación.
  - Field key con special chars → rechazado.
  - Field type inválido → rechazado.
  - Options jsonb con payload masivo (>1MB) → rechazado.
  - Concurrent createObject same key → solo uno gana.
  - DDL que falla a mitad → no deja estado inconsistente.
  - DropColumn de field sistema → 403.
- **Criterios de aceptación**:
  - [ ] 10+ tests adversarios pasando.
  - [ ] Documentar en `planning/threat-models/03-metadata.md`.

### [qa] WAPPY-03-11 — Tests funcionales de los 12 tipos de field
- **Puntos**: 5
- **Depende de**: WAPPY-03-08
- **Descripción**: Por cada tipo, test e2e: crear object, añadir field del tipo, insertar row con valor válido (vía SQL raw en este sprint, REST viene en S5), leer, actualizar, intentar insertar inválido. 12 tipos × ~3 assertions = ~36 tests.
- **Criterios de aceptación**:
  - [ ] 12 suites de test pasando.
  - [ ] CSV de cobertura por tipo en `tests/coverage/metadata-types.md`.

### [cybersecurity] WAPPY-03-12 — Audit del DdlGenerator
- **Puntos**: 5
- **Depende de**: WAPPY-03-06
- **Descripción**: Review intensivo:
  - SQL injection: ¿todos los identifiers pasan por sanitization? ¿literals por parámetros?
  - Authorization: ¿solo Admin puede crear/borrar objects?
  - Resource exhaustion: ¿hay límite de objects per workspace? Per field?
  - DoS: ¿qué pasa si cliente crea 10,000 objects? ¿alguien puede triggerar DDLs caros?
  - Cross-tenant: ¿el DDL siempre va al schema del workspace del context?
- **Criterios de aceptación**:
  - [ ] Documento en `planning/threat-models/03-metadata.md` ampliado.
  - [ ] Límites hard implementados: max 100 objects per workspace en Pro, 200 en Business, ilimitado en Enterprise.
  - [ ] Max 50 fields per object.
  - [ ] Rate limit estricto en endpoints `/_meta/*`: 10 ops/min per workspace.

### [devops] WAPPY-03-13 — Dashboard Grafana: DDL operations metrics
- **Puntos**: 2
- **Depende de**: WAPPY-03-06
- **Descripción**: Métricas:
  - `wappy_ddl_operations_total{workspace_slug,action,success}`
  - `wappy_ddl_duration_seconds{action}`
  - Dashboard "Metadata Engine" en Grafana con throughput, error rate, p95 latency.
- **Criterios de aceptación**:
  - [ ] Dashboard visible.
  - [ ] Alerta si error rate >5% en 5 min.

### [data-analyst] WAPPY-03-14 — Definir eventos analíticos del MetadataEngine
- **Puntos**: 2
- **Depende de**: WAPPY-03-08
- **Descripción**: Definir qué eventos trackear para analytics de producto:
  - `metadata.object.created` (con dimensiones: workspaceSlug, plan).
  - `metadata.object.deleted`.
  - `metadata.field.created` (con tipo).
  - Persistir en `core.product_events` (tabla nueva en core schema).
  - Permite saber qué clientes usan custom objects, qué tipos de field son populares, etc.
- **Criterios de aceptación**:
  - [ ] Tabla `core.product_events` creada.
  - [ ] 3 eventos emitidos desde MetadataService.
  - [ ] Query Grafana: "% workspaces que crearon ≥1 custom object esta semana".

---

## Métricas del sprint

| Métrica | Target |
|---|---|
| Total story points | 57 |
| Tareas backend | 6 |
| Tareas architect | 2 |
| Tareas qa | 2 |
| Tareas cybersecurity | 1 |
| Tareas devops | 1 |
| Tareas data-analyst | 1 |
| Tareas team-lead | 2 |

## Notas

- **Sprint más riesgoso del MVP**. DDL runtime es donde se rompen las cosas. QA + cybersec deben darle prioridad máxima.
- El cron de drop column real (cooldown 30d) se difiere a S21 (hardening). Aquí solo soft-delete.
- Relations vienen en S4. Validations también.
- Auto-API REST (que consume estos objects) viene en S5.
