# Sprint 04 — Metadata Engine: Relations + Validations

**Duración**: 2 semanas
**Objetivo**: Completar el motor de metadata con relaciones entre objects + reglas de validación. Sin esto, custom objects son tablas aisladas; con esto, son un graph navegable.
**Definition of Done del sprint**:
- API permite crear relación oneToMany / manyToOne / oneToOne / manyToMany entre 2 objects.
- DDL ejecuta FKs y pivot tables correctamente.
- Validation rules (regex, range, enum, custom JS sandboxed) funcionan al insertar/actualizar rows.
- Cascade rules configurables (CASCADE, SET NULL, RESTRICT).
- Orphan detection cron.

**Demo**: crear Order ←→ Customer (manyToOne); intentar Order con customerId inexistente → 400; configurar cascade delete; borrar Customer → Orders se borran; validation "total > 0" rechaza orden inválida.

**Riesgos**: V8 isolate sandbox para custom JS es complejo. Mitigación: si se complica, diferir custom JS rules a v1.1, dejar solo regex/range/enum en este sprint.

**Referencias**: [[ADR-003]], [[ADR-004]].

---

## Tareas

### [team-lead] WAPPY-04-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-04-13 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-04-02 — Diseño de RelationDefinition + DDL strategy
- **Puntos**: 5
- **Descripción**:
  - `RelationDefinition` (tabla `_meta_relations`): id, sourceObjectId, targetObjectId, type (oneToOne|oneToMany|manyToOne|manyToMany), sourcePropertyName, targetPropertyName, onDelete (CASCADE|SET NULL|RESTRICT), createdAt, deletedAt.
  - DDL por tipo:
    - manyToOne: `ALTER TABLE source ADD COLUMN <target>_id uuid REFERENCES target(id) ON DELETE <rule>` + índice.
    - oneToMany: virtual (inverso de manyToOne). NO ejecuta DDL nuevo; solo registra en metadata para que el query engine sepa cómo joinear.
    - oneToOne: como manyToOne pero con UNIQUE constraint.
    - manyToMany: crea tabla pivot `<source>_<target>` con FKs + PRIMARY KEY composite.
  - Reglas: no permitir circular cascades hard, alertar.
- **Criterios de aceptación**:
  - [ ] Doc `src/metadata/RELATIONS.md`.

### [architect] WAPPY-04-03 — Diseño del Validation engine
- **Puntos**: 3
- **Descripción**:
  - `ValidationRule` (jsonb en FieldDefinition.options): array de `{ type, params, errorMessage, errorKey }`.
  - Tipos soportados:
    - `regex` (params: pattern).
    - `range` (params: min, max).
    - `enum` (params: values[]).
    - `length` (params: min, max — for text/longText).
    - `custom_js` (params: code) → V8 isolate sandbox, eval con contexto limitado (just the value).
  - Evaluación al insert/update. Si falla, throw 400 con array de errores estructurado.
- **Criterios de aceptación**:
  - [ ] Doc `src/metadata/VALIDATIONS.md`.
  - [ ] Decisión sobre V8 isolate: si requiere lib externa (isolated-vm) o sin custom_js en este sprint.

### [backend] WAPPY-04-04 — Implementar DDL operations para relations
- **Puntos**: 8
- **Depende de**: WAPPY-04-02
- **Descripción**: Extender `DdlGenerator`:
  - `addRelation({ type, source, target, onDelete })` → ejecuta DDL apropiado.
  - `removeRelation(relationId)` → soft-delete; drop FK/pivot lo hace cron en S21.
  - Validar que ambos objects existen.
  - Validar que no se crea circular CASCADE.
- **Criterios de aceptación**:
  - [ ] 4 tipos funcionan: tests integration con DB real.
  - [ ] FKs con índices automáticos.
  - [ ] Pivot tables con PRIMARY KEY composite.

### [backend] WAPPY-04-05 — Extender MetadataService con relations CRUD
- **Puntos**: 3
- **Depende de**: WAPPY-04-04
- **Descripción**:
  - `addRelation`, `listRelations(objectKey)`, `removeRelation`.
  - Cache invalidation en cambios.
- **Criterios de aceptación**:
  - [ ] Tests unit + integration.

### [backend] WAPPY-04-06 — Controllers REST /_meta/objects/:key/relations
- **Puntos**: 2
- **Descripción**: Endpoints CRUD relations. Documentación Swagger.

### [backend] WAPPY-04-07 — Implementar ValidationEngine (regex, range, enum, length)
- **Puntos**: 5
- **Depende de**: WAPPY-04-03
- **Descripción**: Service `ValidationEngine` que recibe FieldDefinition + value, devuelve `{ valid, errors[] }`. Implementar tipos:
  - regex (con timeout para ReDoS).
  - range (numéricos).
  - enum.
  - length (strings).
- **Criterios de aceptación**:
  - [ ] Tests unit completos.
  - [ ] ReDoS test: patrón malicioso → timeout 100ms.

### [backend] WAPPY-04-08 — ValidationEngine custom_js con isolated-vm (si scope lo permite)
- **Puntos**: 8
- **Depende de**: WAPPY-04-07
- **Descripción**: Si time permite, integrar `isolated-vm` para custom_js rules:
  - Sandboxed V8 isolate por evaluación.
  - Memory limit 16MB, CPU timeout 100ms.
  - Acceso solo a `value` (no a request, no a DB).
  - Eval debe ser determinístico (no Math.random, no Date.now sin freeze).
- **Criterios de aceptación**:
  - [ ] Si implementado: tests pasan, adversarios pasan.
  - [ ] Si no: documentar como tech debt para v1.1.

### [backend] WAPPY-04-09 — Cron de orphan detection
- **Puntos**: 3
- **Descripción**: Job BullMQ cron diario que detecta orphans (rows con FK apuntando a row borrada en otra tabla, posible si onDelete=SET NULL falló por race). Loguea, no auto-fix.

### [qa] WAPPY-04-10 — Tests e2e de relations
- **Puntos**: 5
- **Descripción**: Por cada tipo de relation, test:
  - Crear relación.
  - Insertar rows en ambos lados.
  - Read con include (vía SQL raw todavía; vía REST viene en S5).
  - Cascade delete behaviors.
  - Orphan detection.

### [qa] WAPPY-04-11 — Tests adversarios de validation
- **Puntos**: 3
- **Descripción**: Tests:
  - ReDoS patterns.
  - JS code que intenta escapar el sandbox.
  - Validation rule que tira excepción → no crashea el insert.

### [cybersecurity] WAPPY-04-12 — Audit del isolated-vm sandbox
- **Puntos**: 5
- **Depende de**: WAPPY-04-08
- **Descripción**: Si se implementó custom_js, audit intensivo:
  - Verificar que el sandbox no expone globals peligrosos.
  - Test de evasion conocidas.
  - Performance test (1000 evals/seg sin leaks de memoria).
- **Criterios de aceptación**:
  - [ ] Documento en threat model.
  - [ ] Si no es seguro, deshabilitar custom_js y diferir.

---

## Métricas

| Total story points | 52 |
| Backend | 5 / Architect 2 / QA 2 / CyberSec 1 / TL 2 |

## Notas

- Si `isolated-vm` requiere build native que falla en Railway, considerar `vm2` (menos seguro pero más portable). Documentar.
- En este sprint NO se exponen relations en API REST cliente — eso es parte de auto-API (S5/S6). Aquí solo en /_meta/.
