# Sprint 07 — Contacts + Tags + Events

**Duración**: 2 semanas
**Objetivo**: CRM básico. Contacts construidos como object sistema sobre el Metadata engine (consistencia + soporta custom fields). Tags cross-cutting. Events timeline.
**Definition of Done del sprint**:
- Contacts CRUD vía auto-api + endpoints custom (identify, merge, import CSV).
- Tags polimórficos (scope contact|conversation|both).
- Events tracking + timeline read.
- Full-text search funcional.
- Identify API para widget/mobile.

**Demo**: import 1000 contacts CSV; tag VIP; track event "purchase"; ver timeline; búsqueda "amelia" devuelve match.

**Riesgos**: import CSV con custom fields = mapeo complejo. Mitigación: empezar con mapping manual desde UI, automatización en v1.1.

---

## Tareas

### [team-lead] WAPPY-07-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-07-13 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-07-02 — Diseño Contact como object sistema
- **Puntos**: 3
- **Descripción**: Decidir: Contact tiene tabla TypeORM dedicada (entity tradicional) PERO también está registrado en `_meta_objects` con `tier=system, isSystem=true`. Eso permite:
  - Auto-API genérica funciona sobre Contact.
  - Contact soporta custom fields (vía Metadata engine `addField`).
  - Lógica custom (`identify`, `merge`, dedup) vive en `ContactsService` tradicional.
  - Mismo pattern para todos los objects sistema.

### [backend] WAPPY-07-03 — Generar módulo Contact + customizar
- **Puntos**: 3
- **Descripción**: `npm run generate:resource:relational -- --name Contact`. Añadir propiedades: externalId, name, email, phone, avatar (oneToOne File), locale, timezone, lastSeenAt. Tabla en tenant schema. Registrar en `_meta_objects` con isSystem=true durante onboarding.

### [backend] WAPPY-07-04 — Implementar identify API
- **Puntos**: 3
- **Descripción**: `POST /api/v1/contacts/identify` con `{ externalId, attributes }`. Si no existe → crea. Si existe → update. Autenticación: workspace API key + opcional contact token. Usado por widget JS y apps móviles.

### [backend] WAPPY-07-05 — Deduplicación + merge
- **Puntos**: 5
- **Descripción**: Detection automática al create (email/phone/externalId matches). Endpoint `POST /api/v1/contacts/:id/merge` con `targetContactId`: mueve eventos, conversaciones, tags al target; borra source.

### [backend] WAPPY-07-06 — Import CSV
- **Puntos**: 5
- **Descripción**: `POST /api/v1/contacts/import` upload CSV. Worker BullMQ procesa async, devuelve jobId. Endpoint `GET /api/v1/contacts/import/:jobId` para status. Mapeo de columnas en body de upload. Limit 50k rows per upload Pro / 200k Business / 1M Enterprise.

### [backend] WAPPY-07-07 — Full-text search con tsvector + GIN
- **Puntos**: 3
- **Descripción**: Column generated `search_vector tsvector` actualizada con trigger. Index GIN. Endpoint `GET /api/v1/contacts?search=amelia` usa `@@`. Soporta español, inglés, portugués con dictionary apropiado per workspace locale.

### [backend] WAPPY-07-08 — Módulo Tag (cross-cutting)
- **Puntos**: 3
- **Descripción**: `npm run generate:resource:relational -- --name Tag`. Campos: name, color, scope (contact|conversation|both). Pivots `ContactTag` y `ConversationTag` (esta se usa en S9). Autocomplete `GET /api/v1/tags?q=vip`.

### [backend] WAPPY-07-09 — Módulo Event (timeline)
- **Puntos**: 3
- **Descripción**: `Event` (contactId, type, payload jsonb, occurredAt, source). Endpoint `POST /api/v1/contacts/:id/events` (track). `GET /api/v1/contacts/:id/events?cursor=` (paginated descending). Types sistema + custom (`custom.*`).

### [qa] WAPPY-07-10 — Tests e2e Contacts
- **Puntos**: 5
- **Descripción**: CRUD, identify (create+update), merge, import CSV (small), search, custom fields propagation.

### [qa] WAPPY-07-11 — Tests Tags + Events
- **Puntos**: 3
- **Descripción**: Tag CRUD + assign + autocomplete. Event tracking + timeline pagination.

### [cybersecurity] WAPPY-07-12 — Audit identify API + import CSV
- **Puntos**: 3
- **Descripción**: Identify es endpoint público (apiKey). Audit:
  - Rate limit per apiKey (100/min).
  - Validation de externalId formato.
  - Validation de attributes (limit size).
  - Import CSV: límite de tamaño, validación de MIME, no XSS en values.

---

## Métricas | Total story points | 41 |

## Notas

- Custom Objects (otros que no sean Contact) se crean por cliente vía /_meta/. Ya están funcionando desde S3.
- Products como object pre-creado lo sembramos en S20 (templates verticales).
