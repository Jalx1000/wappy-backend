# Modules Brief

Catálogo completo de los **17 módulos** y **60 features** de Wappy, con su tier de prioridad (MVP / v1.1 / v2) y el sprint donde se construyen.

Cada módulo tiene una clave (`moduleKey`) usada por el `ModuleRegistry` y un tier (`core` / `system` / `optional`) que define si puede deshabilitarse por workspace.

---

## Capa 0 — Cross-cutting (no UI propia, infraestructura)

### Tenancy `core` `MVP`
Resolución de tenant por subdominio + scoping schema-per-tenant. Sin UI; todo lo demás depende de esto.
**Sprint**: S1. **Features**: schema-per-workspace, `TenantSchemaResolver` (ALS), `TenantContext`, `BaseSchemaRepository`, CLI `tenant:create`.

### Real-time `core` `MVP`
Gateway WebSocket compartido + Redis adapter para fan-out multi-instancia.
**Sprint**: S9. **Features**: namespace `/rt`, JWT handshake, rooms `ws:{wsId}:*`, eventos catalogados, Redis pub/sub.

### Permisos (RBAC) `core` `MVP`
Roles base + matriz de permisos granular. Guards globales.
**Sprint**: S2 (base), evoluciona en S3+ con permisos sobre custom objects. **Features**: `Admin/Agent` extensibles, `@Roles(...)`, `@Permissions(...)`, field-level perms (v1.1 en S25).

---

## Capa 1 — Foundation

### Auth `core` `MVP`
Extiende `src/auth*` existente. Multi-tenant aware.
**Sprint**: S2. **Features**:
- Signup público (crea workspace + Admin Member + trial 7d)
- Signup por invitación (`Invitation` token)
- Login con resolución por subdominio o header
- Refresh tokens con rotación
- Reset password + confirm email (ya existe)
- OAuth Google + Facebook (ya existe, integrar con workspace)
- SSO SAML/OIDC → `v1.1` en S22
- SCIM → `v1.1` en S23
- MFA → `v2`

### Workspaces `core` `MVP`
Tenant principal. Settings, identidad, branding, API keys.
**Sprint**: S2. **Features**:
- CRUD del workspace propio (`GET/PATCH /workspaces/me`)
- Slug único + apiKey hashed
- Branding (`brandColor`, `logoFileId`, `widgetGreeting`, `widgetPosition`, `widgetWelcomeMessage`)
- API keys multi (rotación, revocación)
- Onboarding state (5 pasos del wizard)
- Custom domain → `v1.1` en S24

### Plans & Billing `core` `MVP`
Planes Pro/Business/Enterprise + trial + facturación manual.
**Sprint**: S2. **Features**:
- `Plan` entity (Trial/Pro/Business/Enterprise) con límites declarativos
- `Subscription` (workspaceId, planId, status, currentPeriodStart/End)
- Trial 7d timer + auto-downgrade a Suspended
- Cron de suspensión por falta de pago
- Manual billing dashboard (admin sistema marca pagado)
- Stripe Billing → `v2` en S33

### Members & Roles `core` `MVP`
Agentes del workspace. Pivot User ↔ Workspace.
**Sprint**: S2 (base), evoluciona en S15 con presencia. **Features**:
- `Member` (workspaceId, userId, role, joinedAt, status `active|invited|suspended`)
- Invitaciones (email + token expirable)
- Cambio de rol + suspensión
- Presencia online/offline (S15, Redis-backed con heartbeat)
- Co-presencia en conversación (S15)
- Activity log de cada Member → `MVP` parcial en S15

### ModuleRegistry `core` `MVP`
Habilitar/deshabilitar módulos `system` y `optional` por workspace.
**Sprint**: S2. **Features**:
- `WorkspaceModule` (workspaceId, moduleKey, isEnabled, settings, disabledAt, disabledByUserId)
- Catálogo de módulos con tier (core/system/optional)
- Endpoint `POST /workspace/modules/:key/{enable,disable}` con type-to-confirm
- Guard global `ModuleEnabledGuard` (deshabilitado → 404)
- Cooldown 30 días antes de "Permanently delete data"
- Audit log de cada toggle
- Cron de aviso a admin al día 28

---

## Capa 2 — Metadata Engine (corazón Twenty-style)

### Metadata: Objects + Fields `core` `MVP`
Definiciones runtime de entidades y campos.
**Sprint**: S3. **Features**:
- `ObjectDefinition` (key, label, icon, tier `system|custom`) por tenant
- `FieldDefinition` (objectId, key, label, type, options jsonb, isRequired, isUnique, defaultValue)
- **12 tipos de field**: text, longText, number, currency, boolean, date, datetime, select, multiselect, email, phone, url
- **DDL generator**: `CREATE TABLE`, `ALTER TABLE` (add/drop/rename column), índices automáticos en FKs y campos searchable
- Default values + computed defaults (`currentUser`, `now`, fórmula simple)
- Audit log per metadata change
- Cooldown 30d antes de drop column real

### Metadata: Relations + Validations `core` `MVP`
Relaciones entre objects + validation rules.
**Sprint**: S4. **Features**:
- `RelationDefinition` (sourceObjectId, targetObjectId, type `oneToOne|oneToMany|manyToOne|manyToMany`, cascade, propertyName, inversePropertyName)
- DDL: FKs para to-one, tablas pivot para manyToMany
- Validation rules (regex, range, enum, custom JS sandboxed con V8 isolate)
- Orphan detection
- Cascade delete configurable

### Auto-API: REST `core` `MVP`
Endpoints REST auto-generados por object.
**Sprint**: S5. **Features**:
- Dynamic controller factory registra `/api/v1/{object_plural}` por object al levantar (warm-up) y al cambiar metadata
- CRUD completo: list (filter, sort, paginate, search), get, create, update, delete
- Bulk: bulkCreate, bulkUpdate, bulkDelete
- OpenAPI spec auto-generada por workspace en `/docs/{slug}`
- Permission checks: object-level + field-level (v1.1)
- Rate limit per plan
- Webhooks `object.{created|updated|deleted}` (entra en S12)

### Auto-API: GraphQL + Views `core` `MVP`
GraphQL schema dinámico + vistas configurables.
**Sprint**: S6. **Features**:
- GraphQL schema builder desde metadata (types, queries, mutations, subscriptions)
- DataLoader anti N+1
- Apollo playground en `/graphql`
- `ViewDefinition` (objectId, name, type `table|kanban|calendar|gallery|list|map`, filters jsonb, sort, group, columns)
- Saved views compartidas por workspace o privadas
- CSV export
- Import CSV → S7
- Map view → `v1.1`
- Real-time subscriptions GraphQL → `v2`

---

## Capa 3 — Datos cliente

### Contacts `system` `MVP`
CRM básico. Construido sobre Metadata engine como "object sistema".
**Sprint**: S7. **Features**:
- `Contact` con campos sistema (name, email, phone, avatar, locale, timezone, lastSeenAt, externalId)
- Soporta custom fields (vía Metadata engine)
- Identify API (`POST /contacts/identify` con apiKey + token)
- Deduplicación por email/phone/externalId
- Merge de duplicados
- Import CSV con mapping de columnas
- Full-text search (Postgres `tsvector + GIN`)

### Tags `system` `MVP`
Cross-cutting sobre Contacts y Conversations.
**Sprint**: S7. **Features**:
- `Tag` (workspaceId, name, color, scope `contact|conversation|both`)
- Pivots `ContactTag` y `ConversationTag`
- CRUD + autocomplete
- Filtros del inbox por tag

### Events (timeline) `system` `MVP`
Eventos del Contact (CRM timeline).
**Sprint**: S7. **Features**:
- `Event` (workspaceId, contactId, type, payload jsonb, occurredAt)
- Types sistema (`signup`, `app.opened`, `payment.declined`, `plan.upgraded`, `conversation.opened`) + custom (`custom.*`)
- API `POST /contacts/:id/events`
- Timeline paginado descendente
- Retention configurable (default 1 año)

### Attributes (Custom fields) `system` `MVP`
UI de gestión de custom fields. Construye sobre Metadata engine.
**Sprint**: S3 (engine), expuesto en UI en S7. **Features**:
- "Manage attributes" en UI para Contact, Conversation, y cada custom object
- 12 tipos visibles del screenshot (NPS score, Lifetime spend, VIP, Customer since, etc.)
- Field-level permissions → `v1.1`

### Products `system` `MVP`
Catálogo simple. Es un custom object pre-creado en workspaces nuevos.
**Sprint**: S7 (template), modelado en S3. **Features**:
- Pre-creado como object con sku, name, price, currency, imageFileId
- Composer "share product" inserta `[[product:id]]`
- Bloque "Products shared" en panel derecho de conversación
- Catálogo CRUD

### Custom Objects (Twenty-style) `optional` `MVP`
Lo que define a Wappy como plataforma.
**Sprint**: S3-S6 (engine), S7+ (uso). **Features**: ya cubiertas por Metadata Objects/Fields/Relations + Auto-API.

---

## Capa 4 — Comunicación

### Channels `core` `MVP`
Infra multi-canal + cuentas por canal.
**Sprint**: S8 (Web + Email), S14 (WhatsApp Cloud), v2 (Messenger/IG). **Features**:
- `Channel` (workspaceId, type, name, isActive)
- `ChannelAccount` (channelId, credentials cifradas per-workspace key, externalId — phoneNumberId/pageId)
- N cuentas por canal
- Webhook inbound dispatcher (`/webhooks/{type}`) con signature verification + dedupe
- Outbound workers BullMQ con retry/backoff
- Health check por ChannelAccount

### Widget SDK API `system` `MVP`
Endpoints públicos para el snippet JS embebible.
**Sprint**: S8. **Features**:
- `POST /widget/v1/init` (config + branding)
- `POST /widget/v1/identify` (asocia Contact)
- `POST /widget/v1/conversations` (crea + primer mensaje)
- `GET /widget/v1/conversations/:id/messages`
- `POST /widget/v1/messages` (envía como contact)
- Token efímero por session
- Rate limit estricto (es público)
- CORS dinámico por workspace

### Web Widget `system` `MVP`
Backend para el snippet vanilla JS. SDK frontend vive en otro repo, backend expone API + WS.

**Sprint**: S8 (API) + S9 (WS contact-side). **Features**: presence "contact viewing chat", real-time message delivery.

### Email channel `system` `MVP`
Inbound + outbound email.
**Sprint**: S8. **Features**:
- Inbound vía webhook Resend (parse + threading por `In-Reply-To` o reply-token)
- Outbound vía Resend (provider behind `MailProvider` port)
- Reply-to único por conversación (`{convToken}@reply.wappy.dev`)
- HTML + plain rendering
- Attachments

### WhatsApp Cloud (BYO) `system` `MVP`
Cada workspace conecta su propia Meta Business.
**Sprint**: S14 (canal completo, junto con campaigns templates). Stub en S8 si se quiere chat básico antes. **Features**:
- ChannelAccount con `phoneNumberId`, `accessToken`, `wabaId`
- Inbound vía webhook Meta compartido (routing por `phone_number_id`)
- Outbound: session messages (24h gratis), template messages (paga el cliente)
- Plantillas (submission, approval state, render con variables)
- Media support (image, audio, video, document)
- Anti-spam: respeta políticas Meta

### Messenger BYO `system` `v2`
**Sprint**: S27+. **Features**: similar a WhatsApp pero con Page tokens.

### Instagram DM BYO `system` `v2`
**Sprint**: S27+. **Features**: integración con Instagram Basic Display + Messaging.

### Conversations & Messages `core` `MVP`
El corazón del inbox.
**Sprint**: S9. **Features**:
- `Conversation` (contactId, channelAccountId, status `open|snoozed|resolved`, priority, snoozedUntil, slaDueAt, firstResponseAt, lastMessageAt)
- `Message` (conversationId, authorType `contact|member|system|bot`, authorId, content, attachments jsonb, isPrivate, channelMessageId, deliveredAt, readAt)
- `ConversationAgent` pivot (multi-asignee + assignedAt)
- Estados con transiciones controladas
- Notas internas (`isPrivate=true`)
- Adjuntos vía R2 presigned URLs
- Eventos real-time: `message:new|read`, `typing:start|stop`, `conversation:assigned|status`
- Filtros inbox: You / Unassigned / All / by tag

### SLA `system` `MVP`
Timers de respuesta + escalado.
**Sprint**: S10. **Features**:
- `SlaPolicy` (firstResponseMinutes, resolutionMinutes, businessHours jsonb, channelFilter, priorityFilter)
- Worker BullMQ cron evalúa near-breach y breach
- Emite `sla:warning` y `sla:breach` (consumibles por Automations)
- Badge "Reply in X:YZ" para frontend

### Macros (Saved replies) `system` `MVP`
Plantillas de respuesta rápida.
**Sprint**: S10. **Features**:
- `Macro` (name, body, variables jsonb, scope `personal|workspace`)
- Trigger por `/` en composer
- Variables (`{{contact.name}}`, `{{conversation.tag}}`)
- Render con datos del contexto

---

## Capa 5 — Self-service y contenido

### Calendar / Booking `system` `MVP`
Calendar interno + slot booking público.
**Sprint**: S10. **Features**:
- `CalendarEvent` (workspaceId, ownerId, title, location, startsAt, endsAt, attendees jsonb, recurrence rrule, isPrivate)
- `BookableSlot` (calendarId, dayOfWeek, startTime, endTime, duration, bufferBefore/After)
- `Booking` (bookableSlotId, contactId, startsAt, endsAt, status, notes)
- Link público `book.{slug}.wappy.dev/{calendar-slug}`
- Confirmación email + (opcional) recordatorio
- iCal export
- Sync Google Calendar / Outlook → `v1.1`

### Help Center `system` `MVP`
KB pública por workspace.
**Sprint**: S10. **Features**:
- `Collection` (jerárquica con parentId, slug, name, description, order)
- `Article` (collectionId, slug, title, body markdown, status `draft|published`, locale, publishedAt, authorId)
- `ArticleView` (analytics: contactId opcional, articleId, occurredAt)
- Postgres FTS + ranking por views
- Sitio público en Cloudflare Pages consumiendo API REST
- Búsqueda semántica con embeddings → `v2` en S28

---

## Capa 6 — Automatización

### Bot Builder `system` `MVP`
Flujos de conversación automáticos.
**Sprint**: S11. **Features**:
- `BotFlow` (name, trigger jsonb, nodes jsonb, version, isActive)
- `BotRun` (botFlowId, conversationId, currentNodeId, state jsonb, startedAt, endedAt)
- Node types fijos: `message | question | condition | assign | article | end`
- State machine engine
- Versionado de flows (poder rollback)
- Test mode (ejecutar sin afectar conversación real)

### Automations (Rules) `system` `MVP`
Reglas when/then sobre eventos.
**Sprint**: S12. **Features**:
- `AutomationRule` (trigger jsonb, conditions jsonb, actions jsonb, isActive, dedupKey)
- Triggers: `conversation.created|assigned|tagged|status_changed`, `message.received|sent`, `contact.created|attribute_changed`, `customobject.created|updated|deleted`, `sla.warning|breach`
- Actions: `tag`, `assign`, `notify`, `webhook`, `set_attribute`, `add_to_campaign`, `trigger_workflow`, `send_message`
- Event bus interno → ejecución sincrónica o vía BullMQ según action
- Rate limit per rule + dedup

### Workflow Builder `optional` `MVP`
Workflows visuales multi-step (n8n-style).
**Sprint**: S13. **Features**:
- `Workflow` (name, nodes jsonb con positions, edges jsonb, isActive)
- `WorkflowRun` (state persistente, currentNodeId, variables)
- Node types: `trigger | condition | loop | parallel | action | delay | http_request | custom_function`
- Custom function: V8 isolate sandboxed JS
- Retry policy configurable
- Run history para debugging
- Manual trigger + webhook trigger + schedule trigger

### Campaigns `system` `MVP`
Outbound proactivo masivo.
**Sprint**: S14. **Features**:
- `Campaign` (name, type `inapp|email|push|whatsapp`, audience jsonb, template jsonb, scheduledAt, status)
- `CampaignDelivery` (campaignId, contactId, status, sentAt, error)
- Audience builder sobre Contacts + custom objects
- BullMQ pipeline: chunk → enqueue → send → track
- A/B variants
- WhatsApp templates (marketing/utility/OTP) con submission a Meta
- Email templates con variables
- In-app via WebSocket
- Push → `v2` en S27

---

## Capa 7 — Insights

### Analytics `system` `MVP`
Métricas operativas predefinidas.
**Sprint**: S16. **Features**:
- `MetricSnapshot` (workspaceId, key, period, periodStart, value, dimensions jsonb)
- Materialización vía BullMQ cron horario
- Métricas predefinidas: TMR, FRT, CSAT, NPS, volumen conv/mensajes/contactos, performance por agente, distribución por canal, resolution rate
- Dashboards predefinidos (Inbox Health, Agent Performance, Channel Mix)
- CSAT survey post-resolución (`Survey` entity + responses)

### Custom Dashboards `optional` `MVP`
El cliente arma sus propios dashboards.
**Sprint**: S16. **Features**:
- `Dashboard` (workspaceId, name, layout jsonb, isShared)
- `Widget` (dashboardId, type, config jsonb, position)
- Widget types: number, bar, line, pie, funnel, table, kanban
- Queries contra custom objects (con scoping tenant)
- Sharing por link público con auth opcional
- Embed en página externa → `v1.1`

### Reports `system` `MVP`
Reportes programados por email.
**Sprint**: S16. **Features**:
- `Report` (workspaceId, name, dashboardId, recipients, schedule cron, format `pdf|csv|xlsx`)
- BullMQ cron envía
- Renderizado PDF via puppeteer (worker dedicado) o html-to-pdf service
- CSV/XLSX server-side

---

## Capa 8 — Plataforma

### Integrations `system` `MVP`
Conectores con sistemas externos.
**Sprint**: S18. **Features**:
- `Integration` (workspaceId, type `slack|jira|shopify|stripe|zapier`, credentials cifradas, isActive)
- OAuth flow manager
- Sync workers per integration
- Event mappings (qué evento Wappy se manda a qué sistema)
- Bidirectional sync (Stripe webhooks → updates en Contact)

### Webhooks salientes `system` `MVP`
HMAC-signed event delivery.
**Sprint**: S18. **Features**:
- `Webhook` (workspaceId, url, events subscribed, secret, isActive)
- HMAC SHA-256 signing en `X-Wappy-Signature`
- Retry exponential backoff (1m, 5m, 30m, 2h, 12h)
- Dead letter queue después de 5 retries
- Webhook playground (test endpoint que loguea recibido)
- Event catalog versionado

### Notifications `system` `MVP`
Centro de notificaciones + preferencias.
**Sprint**: S19. **Features**:
- `Notification` (memberId, type, payload, isRead, createdAt)
- `NotificationPreference` (memberId, eventType, channels `in_app|email|push`)
- Email digest worker (daily/weekly)
- Push token storage (placeholder, push real en S27)
- Unsubscribe links firmados
- Throttling per-user (no más de N notifs/hora)

### AI Copilot `optional` `MVP`
LLM con cap por workspace.
**Sprint**: S17. **Features**:
- `LlmProvider` port + 2 adapters:
  - `LocalLlmAdapter` (Ollama/vLLM HTTP, primario)
  - `AnthropicAdapter` (Claude Haiku 4.5, fallback)
- Token counting + USD conversion
- Redis counter `llm:usage:{ws}:{yyyy-mm}` con cap $5/mo default
- Endpoint 402 al exceder cap
- Features Copilot:
  - Reply suggestions (3 opciones en composer)
  - Conversation summary
  - Tone rewriting (formal, casual, empathetic, concise)
  - AI sobre custom objects (NL → SQL validado contra tenant schema)
- AI generation (articles, templates) → `v2` en S28
- AI extraction (sentiment, intent, custom field auto-fill) → `v2` en S28

---

## Capa 9 — Colaboración

### Comments `system` `MVP`
Comentarios polimórficos sobre cualquier record.
**Sprint**: S15. **Features**:
- `Comment` (workspaceId, targetType, targetId, authorMemberId, body, mentions jsonb, createdAt)
- Threading (replyToId opcional)
- Markdown rendering
- Edit + soft delete

### Mentions `system` `MVP`
@mentions con notificación.
**Sprint**: S15. **Features**:
- Parser de @username en bodies
- Disparo de notification al mencionado
- Permisos: solo se puede mencionar a Members del workspace

### Activity Log `system` `MVP`
Log de cambios por record.
**Sprint**: S15. **Features**:
- `ActivityLog` (workspaceId, targetType, targetId, actorMemberId, action, diff jsonb, occurredAt)
- Diff calculado del cambio
- Render legible en timeline ("Juan changed status from 'open' to 'resolved'")
- Retention 1 año (configurable)

### Real-time Presence `system` `MVP`
Quién está mirando qué.
**Sprint**: S15. **Features**:
- Heartbeat WebSocket → Redis `presence:{wsId}:{memberId}` con TTL 30s
- Co-presencia en record: `viewing:{targetType}:{targetId}` → Set en Redis
- Event `presence:update` broadcast a workspace
- Co-presencia mostrada en UI ("Ana García is also viewing")

### Attachments `system` `MVP`
Archivos sobre cualquier record o mensaje.
**Sprint**: S9 (mensajes), S15 (records). **Features**:
- R2 storage con path `{workspaceId}/{targetType}/{targetId}/{fileId}`
- Presigned URLs (upload + download)
- Verificación de propiedad antes de firmar
- MIME whitelist (no .exe, etc.)
- Max size configurable per plan

### Share via link `system` `MVP`
Compartir record con link público o autenticado.
**Sprint**: S15. **Features**:
- `ShareLink` (targetType, targetId, token, expiresAt, requiresAuth)
- Permisos read-only por default
- Revocación

### Favorites `optional` `v1.1`
**Sprint**: S29+ o cuando haya feedback. **Features**: Member marca records favoritos para acceso rápido.

### Real-time co-editing `optional` `v2`
**Sprint**: S32. **Features**: CRDT (Yjs o similar) para edición simultánea de notas/comments.

---

## Capa 10 — Enterprise (v1.1)

### SSO `system` `v1.1`
**Sprint**: S22. **Features**: SAML 2.0 + OIDC, JIT provisioning, role mapping.

### SCIM `system` `v1.1`
**Sprint**: S23. **Features**: provisioning automático desde Okta/Azure AD.

### White-label + Custom Domain `system` `v1.1`
**Sprint**: S24. **Features**: CNAME → Cloudflare Custom Hostnames, brand override completo.

### Field-level encryption `system` `v1.1`
**Sprint**: S25. **Features**: per-workspace KMS key, encryption-at-rest para fields marcados.

### Sandboxes `optional` `v1.1`
**Sprint**: S25. **Features**: clone de workspace (subset de data, schema separado), promote a prod.

### Marketplace `optional` `v1.1`
**Sprint**: S26. **Features**: third-party apps con manifest, OAuth provider, review queue.

### Audit log inmutable (extendido) `system` `v1.1`
**Sprint**: S23. **Features**: append-only, retention 2+ años, export a SIEM (JSONL stream).

### Multi-region (EU data residency) `core` `v2`
**Sprint**: S34+. **Features**: Postgres en EU + en NA, workspace ligado a región.

---

## Resumen por tier

| Tier | Cantidad | Descripción |
|---|---|---|
| `core` (MVP) | 9 | No deshabilitables. Sin ellos no hay producto. |
| `system` (MVP) | ~25 | Deshabilitables por workspace pero default-on. |
| `optional` (MVP) | ~6 | Default-off, opt-in. |
| `v1.1` | ~8 | Diferidos a Enterprise (S22-S26). |
| `v2` | ~12 | Post-launch, según traction. |

**Total features**: ~60 (con sub-features detallados podría llegar a 80-100, pero el catálogo top-level es ~60).
