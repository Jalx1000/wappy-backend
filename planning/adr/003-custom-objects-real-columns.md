# ADR 003 — Custom Objects con columnas reales (no JSONB)

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + architect

## Contexto

Wappy permite a cada workspace definir sus propios objects (entidades) en runtime, estilo Twenty CRM / Salesforce / HubSpot Custom Objects. Hay que decidir cómo se materializan en Postgres.

Opciones:

1. **Real columns**: cuando el cliente crea `Order` con campos `total`, `status`, ejecutamos `CREATE TABLE tenant_acme.orders (id, total numeric, status text)`. Cada modificación de metadata dispara `ALTER TABLE`.
2. **JSONB**: una sola tabla `custom_row (id, definitionId, data jsonb)` per tenant. Las filas guardan todo en una columna JSONB. Sin DDL runtime.
3. **EAV (Entity-Attribute-Value)**: una tabla pivote tipo `value (rowId, fieldId, value)`. La más flexible pero la más lenta.

El factor decisivo es performance + experiencia de cliente final. Wappy se posiciona como plataforma seria (compite con Twenty/HubSpot), no como "CRM amateur con JSONB".

## Decisión

**Adoptamos Real columns (opción 1)**. Cada custom object es una tabla real en el schema del tenant, con columnas tipadas de Postgres.

### Detalles

- **Naming**: tabla = `tenant_{slug}.{object_key_plural_snake}` (ej: `tenant_acme.orders`).
- **Columnas**:
  - Sistema (todas las tablas): `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at timestamptz`, `updated_at timestamptz`, `created_by_id uuid`, `updated_by_id uuid`.
  - Custom: una columna por `FieldDefinition`, con tipo Postgres correspondiente:
    - text/longText → `text`
    - number → `numeric`
    - currency → `numeric(18,4)` + columna sibling `_currency text` (`total_currency = 'USD'`)
    - boolean → `boolean`
    - date → `date`
    - datetime → `timestamptz`
    - select → `text` con CHECK constraint
    - multiselect → `text[]`
    - email/phone/url → `text` con CHECK regex
- **Índices automáticos**:
  - Btree en columnas marcadas `isUnique` o `isSearchable`.
  - GIN en columnas `multiselect`.
  - FKs (de relations) llevan índice automático.
- **DDL operations**:
  - Crear field → `ALTER TABLE ... ADD COLUMN ... DEFAULT ...`.
  - Rename field → `ALTER TABLE ... RENAME COLUMN ...`.
  - Drop field → marca como `_deleted` por 30 días (cooldown), luego cron real ejecuta `DROP COLUMN`.
  - Change type → 2 fases: crear columna nueva, copiar con cast, swap, drop vieja. Detrás de feature flag por riesgo.

### Reglas

- DDL runtime corre **transaccional**. Si falla, rollback y se registra error en `metadata_error_log`.
- DDL solo lo ejecuta el `MetadataService` — nunca código de aplicación directamente.
- Audit log por cada DDL: quién, cuándo, qué SQL exacto.
- Lock pesimista por workspace mientras DDL corre (otro request al mismo workspace espera).

## Consecuencias

### Positivas

- **Performance brutal**: queries con filtros (`WHERE status = 'open' AND total > 500`) usan índices nativos de Postgres. Una query típica baja de 80ms (JSONB con GIN) a 3ms (columna indexada).
- **Type safety en DB**: Postgres valida tipos y constraints. JSONB requiere validación en app — más superficie de bugs.
- **GraphQL/REST auto-generation natural**: el schema de tipos sale del SQL information_schema directamente.
- **Compatibilidad con tools externas**: BI tools (Metabase, Superset), pg_dump, ETLs, ven los custom objects como tablas normales del cliente.
- **Backup/restore granular**: dump per object si se quiere.
- **Joins eficientes**: relaciones entre custom objects son FKs reales con plan optimizer de Postgres.

### Negativas

- **DDL en runtime es riesgoso**: bug en el motor de metadata = ALTER TABLE corrupto. Tests pesados, dry-run obligatorio, transaccional siempre.
- **Locks**: `ALTER TABLE ADD COLUMN` con default no-null bloquea la tabla en Postgres < 11; en 11+ es no-blocking si el default es estático. Asegurar Postgres 16+ (ya en compose).
- **Naming validation estricta**: identifiers Postgres tienen reglas (snake_case, ≤63 chars, sin palabras reservadas). El motor de metadata sanitiza y rechaza inputs inválidos.
- **Migration de cambios de tipo**: cambiar `text` → `number` requiere migración con cast. Si los datos no parsean, se trunca o falla. UX debe avisar con warning previo.
- **Connection pool sensible**: DDL toma locks; mantener pool pequeño para DDLs, alto para queries normales. PgBouncer transaction-level.

### Mitigaciones

- **Motor de metadata como engine separado** con tests exhaustivos (sprint 3-4 dedicados solo a esto).
- **Dry-run en sandbox**: cada DDL se prueba contra un schema temporal primero.
- **Cooldown 30d** antes de drop column real → data recuperable si fue por error.
- **Postgres 16+ obligatorio** (en compose ya está postgres:17.9-alpine).
- **Limit hard**: max 200 fields por object, max 100 objects por workspace en plan Pro, max 1000 en Business, ilimitado en Enterprise. Evita workspaces patológicos.
- **Identifier sanitization**: librería robusta con tests adversarios (`'; DROP TABLE foo --` rechazado).

## Alternativa rechazada: JSONB

JSONB fue tentador por simplicidad (sin DDL runtime, sin migrations dinámicas). Razones de rechazo:

- Queries con filtros complejos son 3-10x más lentas incluso con GIN.
- No type safety en DB.
- BI tools ven `data jsonb` y no entienden la estructura.
- Joins jsonb-to-jsonb son una pesadilla de performance.
- Twenty, HubSpot, Salesforce todos usan columnas reales — el precedente es claro.

JSONB queda solo para casos donde sí encaja: `attributes` libre en `Contact`, `payload` en `Event`, `options` en `FieldDefinition`. Pero **no** para storage primario de custom objects.

## Referencias

- Twenty CRM: `packages/twenty-server/src/engine/metadata-modules/` (DDL runtime engine).
- Postgres 11+ release notes (non-blocking `ADD COLUMN DEFAULT`).
- HubSpot Engineering blog: "How we built Custom Objects" (2019).

## Notas

Este es **el ADR más riesgoso del proyecto**. Cualquier bug aquí puede corromper data de cliente. Sprints 3-4 son los más críticos del MVP — qa debe estar a tope.
