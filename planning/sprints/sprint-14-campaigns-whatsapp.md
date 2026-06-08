# Sprint 14 — Campaigns multi-canal + WhatsApp Cloud + BullMQ pipelines

**Duración**: 2 semanas
**Objetivo**: Outbound proactivo masivo en in-app, email, WhatsApp. **Conecta WhatsApp Cloud API (BYO) por primera vez** — Meta Developer es protagonista.
**Definition of Done del sprint**:
- WhatsApp Cloud channel funcionando (inbound + outbound + service tier free + templates marketing/utility paid).
- Campaign CRUD con audience builder.
- BullMQ pipeline: chunk → enqueue → send → track.
- CampaignDelivery tracking per recipient.
- A/B variants.

**Demo**: campaña email "VIPs en MX últimos 30d"; schedule mañana 10am; al disparar manda a 200 destinatarios; tracking en vivo. Mensaje WhatsApp salida via canal BYO.

**Riesgos**: WhatsApp Cloud API tiene fricciones (verification de Meta Business toma tiempo). Si verification del founder no está lista, usar mock channel para tests.

**Referencias**: meta-developer rol mucho.

---

## Tareas

### [team-lead] WAPPY-14-01 — Kickoff + verificar Meta verification status
- **Puntos**: 1
- **Descripción**: Confirmar que Meta Business del founder está verificada. Si no, escalar — bloqueador.

### [team-lead] WAPPY-14-17 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-14-02 — Diseño Campaign + Pipeline
- **Puntos**: 5
- **Descripción**:
  - `Campaign` (name, type inapp|email|push|whatsapp, audience jsonb (filter over Contacts/custom objects), template jsonb, scheduledAt, status draft|scheduled|sending|sent|failed, abVariants jsonb opcional, parentCampaignId opcional para variants).
  - `CampaignDelivery` (campaignId, contactId, variant, status pending|sent|delivered|read|failed|bounced, sentAt, error).
  - Pipeline: campaign → audience query → chunk de 100 → BullMQ batch jobs → per-recipient send job → track delivery.

### [meta-developer] WAPPY-14-03 — Setup Meta App + WhatsApp Cloud API + webhook
- **Puntos**: 5
- **Descripción**:
  - Crear Meta App con productos WhatsApp Business + Permissions.
  - Configurar webhook URL `https://api.wappy.dev/webhooks/meta/whatsapp` con verify token.
  - App Review NO necesario para Cloud API (Cloud API es self-serve).
  - Documentar setup en `docs/whatsapp-setup.md` (para que clientes BYO repliquen).

### [meta-developer] WAPPY-14-04 — Implementar webhook inbound WhatsApp
- **Puntos**: 5
- **Descripción**:
  - Verify signature de Meta.
  - Dedupe por `message.id` (Meta puede reenviar).
  - Route por `phone_number_id` → encuentra ChannelAccount → crea/append Conversation + Message.
  - Soporta tipos: text, image, audio, video, document, location.

### [meta-developer] WAPPY-14-05 — Implementar outbound WhatsApp (service tier + templates)
- **Puntos**: 5
- **Descripción**:
  - Service tier: reply dentro de 24h window → free, sin template.
  - Fuera de ventana o initiating: requiere template aprobado.
  - Worker BullMQ con retry/backoff.
  - Errores Meta logged + reported.

### [meta-developer] WAPPY-14-06 — Templates management
- **Puntos**: 5
- **Descripción**:
  - `WhatsappTemplate` (workspaceId, channelAccountId, name, category marketing|utility|otp, languages, components jsonb, status pending|approved|rejected, metaId).
  - Endpoint para submit template → Meta API.
  - Poll status (Meta tarda horas en aprobar).
  - Render: variables sustitution.

### [backend] WAPPY-14-07 — Generar Campaign + CampaignDelivery
- **Puntos**: 3

### [backend] WAPPY-14-08 — Audience builder
- **Puntos**: 5
- **Descripción**: Reutiliza filter DSL del Auto-API. Audience = query sobre Contacts + (opcional) custom objects. Preview count antes de enviar.

### [backend] WAPPY-14-09 — Pipeline BullMQ (chunk + send + track)
- **Puntos**: 5
- **Descripción**:
  - Job principal: campaign-start → carga audience → spawn chunks.
  - Jobs chunk: batch de 100 → enqueue per-recipient jobs.
  - Per-recipient: send via canal adapter → track delivery.
  - Status updates back to campaign.

### [backend] WAPPY-14-10 — Channels: send via canal correspondiente
- **Puntos**: 5
- **Descripción**: Adapter pattern. `EmailCampaignSender`, `WhatsappCampaignSender`, `InAppCampaignSender` (WS event), `PushCampaignSender` (placeholder S27).

### [backend] WAPPY-14-11 — A/B variants
- **Puntos**: 3
- **Descripción**: Campaign con `abVariants: [{ id, weight, template }]`. Audience split por weight. Tracking per variant.

### [backend] WAPPY-14-12 — CRUD + schedule endpoints
- **Puntos**: 3

### [qa] WAPPY-14-13 — Tests Campaigns (mock channels)
- **Puntos**: 5
- **Descripción**: Audience filter correctness. Chunking. Pipeline e2e con mocks. A/B split.

### [qa] WAPPY-14-14 — Tests WhatsApp inbound/outbound (con mock o sandbox)
- **Puntos**: 5
- **Descripción**: Webhook signature verification. Inbound parsing. Outbound retry. Template rendering. Idealmente contra sandbox Meta o emulador.

### [cybersecurity] WAPPY-14-15 — Audit WhatsApp credentials + webhook
- **Puntos**: 3
- **Descripción**: ChannelAccount credentials cifrados verificados. Webhook signature mandatory. Rate limit webhook (Meta puede inundar).

### [devops] WAPPY-14-16 — Worker dedicated para campaigns
- **Puntos**: 2
- **Descripción**: Separar worker BullMQ para campaigns (CPU/memoria distinta a workers normales). Railway service nuevo.

---

## Métricas | Total story points | 71 |

## Notas

- **Sprint pesado**. Meta-developer carga 5 tareas. Si verification falta, contingencia: usar mock + delay WhatsApp a S15-S16 spillover.
- WhatsApp es feature high-impact comercial. Cualquier slippage afecta launch readiness.
- Push channel deferido a S27 (mobile).
