# Sprint 05 — Auto-API: REST generator

**Duración**: 2 semanas
**Objetivo**: Cada object expone REST endpoints sin código. Cliente crea object "Property" → al instante `GET/POST/PATCH/DELETE /api/v1/properties` funcionan + Swagger documenta + filtros, sort, pagination, search.
**Definition of Done del sprint**:
- Dynamic router registra `/api/v1/{plural}` por cada object al boot + reload en cambios.
- CRUD completo + bulk operations.
- Filter DSL con operadores estándar.
- OpenAPI auto-generado per workspace.
- Permission checks object-level.
- Rate limit per plan.

**Demo**: vía /_meta/ crear Property; sin tocar código, hacer `POST /api/v1/properties { name, price }`, `GET /api/v1/properties?filter[price][gt]=100&sort=-createdAt`, ver Swagger en `/docs/acme`.

**Riesgos**: complejidad alta. Filter DSL es propenso a bugs. Mitigación: tests exhaustivos, snapshots de queries SQL generadas.

**Referencias**: [[ADR-004]].

---

## Tareas

### [team-lead] WAPPY-05-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-05-14 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-05-02 — Diseño del Filter DSL
- **Puntos**: 5
- **Descripción**: Definir lenguaje de filtros para query strings + JSON bodies:
  - Operadores: `eq, ne, gt, gte, lt, lte, in, nin, contains, startsWith, endsWith, isNull, between`.
  - Sintaxis query string: `?filter[field][op]=value` o `?filter[field][in]=a,b,c`.
  - Combinaciones AND/OR/NOT (jsonb body para complejos).
  - Sort: `?sort=field` o `?sort=-field` (descending) o `?sort=a,-b`.
  - Pagination: cursor-based default, offset disponible (`?page=2&perPage=20`).
  - Include: `?include=customer,items` (load relations).
- **Criterios de aceptación**:
  - [ ] Doc `src/auto-api/FILTER_DSL.md`.
  - [ ] Grammar formal (BNF o equivalente).

### [architect] WAPPY-05-03 — Diseño del Dynamic Controller Factory
- **Puntos**: 5
- **Descripción**: Cómo Nest registra controllers dinámicamente:
  - Opción A: módulo dinámico que se reconstruye al boot leyendo metadata.
  - Opción B: un controller genérico `/api/v1/:objectKey/...` que despacha por param (más simple, menos OpenAPI rico).
  - Opción C: middleware Express layer custom que enruta sin Nest controllers (más perf, menos features Nest).
  - Recomendación + tradeoffs.
  - Cómo se invalida y refresca cuando metadata cambia.
- **Criterios de aceptación**:
  - [ ] Doc decisión con opción elegida.

### [backend] WAPPY-05-04 — Implementar Filter DSL parser
- **Puntos**: 5
- **Descripción**: Parser que traduce query string + body a `WhereExpression` interno. Validación contra metadata (field existe, operador válido para tipo).

### [backend] WAPPY-05-05 — Implementar QueryEngine (Filter → TypeORM QueryBuilder)
- **Puntos**: 8
- **Descripción**: `MetadataQueryService.query(objectKey, { filter, sort, pagination, include, search })`:
  - Construye QueryBuilder TypeORM contra schema tenant.
  - Soporta full-text search vía `tsvector` (auto-generado en fields searchable).
  - Soporta includes (joins eficientes).
  - DataLoader para N+1 (incluso en REST, para `include`).
- **Criterios de aceptación**:
  - [ ] Tests SQL snapshots por cada combinación filtro.
  - [ ] No N+1 en includes (validado con query count).

### [backend] WAPPY-05-06 — Implementar Dynamic Controller Factory
- **Puntos**: 8
- **Descripción**: Implementación de la opción elegida (S05-03):
  - Registro al boot.
  - Reload on metadata change (vía evento + restart del módulo dinámico).
  - Genera endpoints CRUD por object.

### [backend] WAPPY-05-07 — DTOs dinámicos + validación con class-validator programático
- **Puntos**: 5
- **Descripción**: Por cada object + operation, generar DTO class al vuelo usando metadata. Decoradores class-validator añadidos vía `Reflect.defineMetadata`. Cache LRU del DTO compilado.

### [backend] WAPPY-05-08 — Bulk operations endpoints
- **Puntos**: 3
- **Descripción**: `POST /api/v1/{plural}/bulk/{create,update,delete}` con array body. Limite 1000 items per call. Devuelve array de resultados con errores per item.

### [backend] WAPPY-05-09 — Permission checks object-level + rate limit per plan
- **Puntos**: 3
- **Descripción**:
  - `Role.permissions` jsonb: `{ "orders": { "read": true, "write": true, "delete": false } }`.
  - Guard check antes de auto-api invoke.
  - Rate limit por plan: Pro 60/min/IP, Business 300/min, Enterprise 1000/min.

### [backend] WAPPY-05-10 — OpenAPI generator per workspace
- **Puntos**: 5
- **Descripción**: Endpoint `GET /docs/{workspaceSlug}` que sirve Swagger UI con spec específico de ese workspace (sus objects + sistema). Spec cacheado per workspace, invalidado en cambios metadata.

### [qa] WAPPY-05-11 — Tests e2e auto-api REST
- **Puntos**: 8
- **Descripción**: Tests:
  - Crear Property via /_meta/ → auto endpoints exist.
  - CRUD completo via auto-api.
  - Filtros: cada operador.
  - Sort, pagination, include.
  - Bulk operations.
  - Permission denial.
  - Rate limit funcionando.

### [qa] WAPPY-05-12 — Tests adversarios filter DSL
- **Puntos**: 3
- **Descripción**: Tests:
  - SQL injection en values.
  - Filter con field inexistente → 400 limpio.
  - Operator inválido.
  - JSON bomb (anidación masiva).

### [cybersecurity] WAPPY-05-13 — Audit del Filter parser + auto-api
- **Puntos**: 3
- **Descripción**: Pen test interno: ¿se puede leer data cross-workspace via filter? ¿extraer columnas no expuestas? ¿bypassear permission?

---

## Métricas

| Total story points | 63 |
| Backend 7 / Architect 2 / QA 2 / CyberSec 1 / TL 2 |

## Notas

- GraphQL viene en S6. Aquí solo REST.
- Auto-API expone también objects SISTEMA (Contact, Conversation, etc. que ya se sembraron en S3). Pero los endpoints "ricos" (con lógica de negocio custom) seguirán siendo controllers tradicionales en sus módulos respectivos. Auto-api es el "lowest common denominator".
- En este sprint, Contact/Conversation aún no tienen lógica de negocio. Eso viene en S7+/S9.
