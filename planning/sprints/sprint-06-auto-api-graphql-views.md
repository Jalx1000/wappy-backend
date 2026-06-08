# Sprint 06 — Auto-API: GraphQL + Views engine

**Duración**: 2 semanas
**Objetivo**: Cerrar el Metadata engine. GraphQL schema dinámico expuesto en `/graphql` con types, queries, mutations por cada object. Views engine permite definir vistas (table, kanban, calendar, gallery) reutilizables por workspace.
**Definition of Done del sprint**:
- Apollo Server con schema generado en runtime desde metadata.
- DataLoader anti N+1 funcionando.
- Subscriptions sobre `object.{created|updated|deleted}` vía Redis.
- Views CRUD + filter persistido.
- CSV export funcional.

**Demo**: en GraphQL playground, query con filters + nested includes; subscription a `propertyCreated` y crear desde otro tab; crear Kanban view por status; exportar CSV.

**Riesgos**: Apollo dynamic schema requiere `buildSchema` low-level. Documentación escasa.

**Referencias**: [[ADR-004]].

---

## Tareas

### [team-lead] WAPPY-06-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-06-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-06-02 — Diseño del GraphQL Schema Builder
- **Puntos**: 5
- **Descripción**: Diseñar cómo construir schema GraphQL desde metadata:
  - Types por object (con types Postgres → GraphQL types).
  - Queries: `{ orders(filter, sort, page) { ... } }`.
  - Mutations: `createOrder`, `updateOrder`, `deleteOrder`.
  - Subscriptions: `orderCreated`, `orderUpdated(id)`, `orderDeleted`.
  - DataLoader pattern para relaciones.
  - Schema cacheado per workspace + invalidation.

### [architect] WAPPY-06-03 — Diseño del Views engine
- **Puntos**: 3
- **Descripción**:
  - `ViewDefinition` (en tenant schema): id, objectKey, name, type (table|kanban|calendar|gallery|list), config jsonb (filter, sort, group, columns), isShared, ownerMemberId.
  - Endpoints CRUD.
  - `GET /api/v1/{plural}?view=:viewId` aplica el view automáticamente.

### [backend] WAPPY-06-04 — Implementar GraphQL Schema Builder
- **Puntos**: 8
- **Descripción**: Service que lee metadata + genera schema GraphQL via `graphql-js` `buildSchema` o `GraphQLSchema` programático. Resolvers genéricos que delegan a `MetadataQueryService`.

### [backend] WAPPY-06-05 — Integrar Apollo Server + playground
- **Puntos**: 3
- **Descripción**: `/graphql` con playground. Auth con JWT desde header. Workspace resuelto por subdomain (mismo middleware).

### [backend] WAPPY-06-06 — DataLoader implementation
- **Puntos**: 5
- **Descripción**: `dataloader` lib por request, scoped a request. Tests anti N+1 obligatorios.

### [backend] WAPPY-06-07 — GraphQL Subscriptions vía Redis pub/sub
- **Puntos**: 5
- **Descripción**: Subscriptions usan `graphql-subscriptions` con `RedisPubSub`. Eventos `object.*` emitidos desde MetadataService + auto-api mutations.

### [backend] WAPPY-06-08 — Views CRUD + apply
- **Puntos**: 5
- **Descripción**: Migration `_meta_views`. Service + controllers. `GET /api/v1/{plural}?view=:id` aplica filter+sort del view.

### [backend] WAPPY-06-09 — CSV export
- **Puntos**: 3
- **Descripción**: `GET /api/v1/{plural}/export?format=csv` con mismos filtros. Stream para datasets grandes. Worker BullMQ si >10k rows.

### [qa] WAPPY-06-10 — Tests e2e GraphQL
- **Puntos**: 5
- **Descripción**: Queries simples + nested + subscriptions + DataLoader assertions.

### [qa] WAPPY-06-11 — Tests Views + export
- **Puntos**: 2
- **Descripción**: CRUD views, apply, CSV export.

---

## Métricas

| Total story points | 46 |

## Notas

- Kanban/Calendar views son metadata sets. La UI los implementa; backend solo provee la abstracción.
- Subscriptions GraphQL pueden coexistir con WS namespace `/rt` (S9). GraphQL subs son para data layer; `/rt` para inbox real-time específico.
- Sprint final del Metadata engine. Después de S6, plataforma tiene su killer feature (custom objects + auto-API REST + GraphQL + views).
