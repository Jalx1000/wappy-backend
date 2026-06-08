# Sprint 10 — Calendar/Booking + Help Center + SLA + Macros

**Duración**: 2 semanas
**Objetivo**: 4 features que cierran la productividad del agente y el self-service del cliente final.
**Definition of Done del sprint**:
- Calendar entity + Booking público con link `book.{slug}.wappy.dev/{cal-slug}`.
- Help Center: Collections + Articles con markdown + FTS público + sitio CF Pages.
- SLA policies + worker BullMQ que evalúa breach.
- Macros (saved replies) con variables.

**Demo**: reservar slot via link público → aparece en calendar agente; crear artículo → aparece en help center público; SLA cuenta regresiva en conv; insertar macro `/saludo` en composer.

**Riesgos**: 4 features = scope amplio. Mitigación: cada feature es relativamente self-contained.

---

## Tareas

### [team-lead] WAPPY-10-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-10-16 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-10-02 — Diseño Calendar + Booking
- **Puntos**: 3
- **Descripción**:
  - `Calendar` (workspaceId, ownerMemberId, slug, name, timezone, isPublic).
  - `CalendarEvent` (calendarId, title, location, startsAt, endsAt, attendees jsonb, recurrence rrule, isPrivate).
  - `BookableSlot` (calendarId, dayOfWeek, startTime, endTime, durationMins, bufferBeforeMins, bufferAfterMins, isActive).
  - `Booking` (bookableSlotId, contactId opcional, startsAt, endsAt, name, email, notes, status confirmed|cancelled, confirmationToken).
  - Conflict detection (no double-book).

### [architect] WAPPY-10-03 — Diseño Help Center + SLA + Macros
- **Puntos**: 3
- **Descripción**: Esquemas para los 3 módulos. SLA: `SlaPolicy` (firstResponseMinutes, resolutionMinutes, businessHours jsonb, channelFilter, priorityFilter). Macros: `Macro` (name, body, variables jsonb, scope personal|workspace).

### [backend] WAPPY-10-04 — Generar Calendar + CalendarEvent + BookableSlot + Booking
- **Puntos**: 5
- **Descripción**: Hygen. Conflict detection en service.

### [backend] WAPPY-10-05 — Endpoints public booking
- **Puntos**: 5
- **Descripción**:
  - `GET book.{slug}.wappy.dev/{cal-slug}/slots?date=YYYY-MM-DD` → slots disponibles.
  - `POST book.{slug}.wappy.dev/{cal-slug}/book` body `{ slotId, name, email, notes }`.
  - Subdomain custom routing.
  - Email confirmation (template nuevo).

### [backend] WAPPY-10-06 — Generar Collection + Article
- **Puntos**: 3
- **Descripción**: Hygen. Article body markdown. Publicar/draft. ArticleView analytics.

### [backend] WAPPY-10-07 — Help Center público + FTS
- **Puntos**: 5
- **Descripción**:
  - Endpoints públicos `GET kb.{slug}.wappy.dev/articles?q=...`.
  - FTS `tsvector` + ranking por views.
  - Subdomain routing.
  - CDN-cacheable headers.

### [backend] WAPPY-10-08 — SLA policies + breach evaluation worker
- **Puntos**: 5
- **Descripción**: `SlaPolicy` CRUD. Worker BullMQ cron cada minuto evalúa conversations open. Emite `sla:warning` y `sla:breach`. Frontend muestra "Reply in X:YZ".

### [backend] WAPPY-10-09 — Macros
- **Puntos**: 3
- **Descripción**: `Macro` CRUD. Endpoint `GET /api/v1/macros?q=salu` para autocomplete. Variables resolution (`{{contact.name}}` → render from context).

### [devops] WAPPY-10-10 — CF Pages site para Help Center
- **Puntos**: 3
- **Descripción**: Repo separado (o subcarpeta) con Next.js estático que consume API REST de `kb.{slug}.wappy.dev`. Deploy a Cloudflare Pages. CDN cache.

### [devops] WAPPY-10-11 — Wildcard book.* y kb.* routing
- **Puntos**: 2
- **Descripción**: En Cloudflare DNS: añadir CNAMEs `book` y `kb` apuntando a API. Subdomain pattern parsing en backend.

### [qa] WAPPY-10-12 — Tests Calendar + Booking
- **Puntos**: 5
- **Descripción**: Conflict detection, timezones, email confirmation, cancel.

### [qa] WAPPY-10-13 — Tests Help Center
- **Puntos**: 3
- **Descripción**: Public endpoints, FTS, draft vs published, view counting.

### [qa] WAPPY-10-14 — Tests SLA + Macros
- **Puntos**: 3
- **Descripción**: SLA breach trigger; macro variable resolution.

### [cybersecurity] WAPPY-10-15 — Audit endpoints públicos (booking, help center)
- **Puntos**: 3
- **Descripción**: Booking sin auth = vulnerable a spam. Rate limit per IP. CAPTCHA opcional. Help Center: no leak de drafts. Subdomain takeover risk check.

---

## Métricas | Total story points | 53 |

## Notas

- 4 features = 4 sub-equipos virtuales (subagents en worktrees paralelos). Excelente sprint para paralelización.
- Calendar es prerequisito para Bot Builder (S11) si bot incluye "book a call" node.
- SLA es prerequisito para Automations (S12) que pueden disparar en `sla:breach`.
