# Sprint 18 — Integrations + Webhooks salientes

**Duración**: 2 semanas
**Objetivo**: Conectividad con ecosistema externo. Slack/Shopify/Stripe/Zapier connectors + webhooks salientes con HMAC.
**Definition of Done del sprint**:
- Integration entity + OAuth manager.
- Slack integration funcional (notif a canal).
- Shopify + Stripe integrations básicas (sync de Customers, Orders).
- Zapier app published (con triggers + actions).
- Webhook entity + HMAC signing + retry exponential.
- Webhook playground para testing.

**Demo**: connect Slack via OAuth → automation manda nueva conv a #support → ver mensaje. Configurar webhook saliente → trigger event → ver llamada en webhook.site con header `X-Wappy-Signature` válido.

---

## Tareas

### [team-lead] WAPPY-18-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-18-14 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-18-02 — Diseño Integration + OAuth manager
- **Puntos**: 3
- **Descripción**:
  - `Integration` (workspaceId, type slack|shopify|stripe|zapier|...|generic, credentials jsonb cifrado, settings jsonb, isActive, lastSyncAt).
  - OAuth flow generic + provider-specific configs.
  - Token refresh handling.
  - Event mappings (qué eventos Wappy se mandan a qué sistema).

### [architect] WAPPY-18-03 — Diseño Webhook outbound + signature
- **Puntos**: 3
- **Descripción**:
  - `Webhook` (workspaceId, url, events subscribed [string[]], secret hashed, isActive, lastDeliveryAt, failureCount).
  - HMAC SHA-256 con secret en `X-Wappy-Signature` header.
  - Retry: 1m, 5m, 30m, 2h, 12h.
  - Dead letter queue después de 5 fallos.

### [backend] WAPPY-18-04 — Generar Integration + Webhook
- **Puntos**: 3

### [backend] WAPPY-18-05 — OAuth manager generic
- **Puntos**: 5
- **Descripción**: Service que maneja: redirect to provider, callback, token storage, refresh. Adapters per provider.

### [backend] WAPPY-18-06 — Slack integration
- **Puntos**: 5
- **Descripción**:
  - Slack OAuth (Bot Token).
  - Send message a canal via Slack Web API.
  - Action handler `slack_notify` para Automations + Workflows.
  - Settings: default channel, mention rules.

### [backend] WAPPY-18-07 — Shopify integration (básico)
- **Puntos**: 5
- **Descripción**:
  - Shopify OAuth (per-store).
  - Sync inicial: Customers → Contacts en Wappy.
  - Webhook Shopify "order created" → Event en Contact + ¿custom object Order?
  - Endpoint sync manual.

### [backend] WAPPY-18-08 — Stripe integration (básico)
- **Puntos**: 5
- **Descripción**:
  - Stripe OAuth Connect.
  - Webhook Stripe "customer.subscription.*" → Event en Contact.
  - Sync: Customers → Contacts.

### [backend] WAPPY-18-09 — Zapier app + webhook trigger
- **Puntos**: 3
- **Descripción**: Publicar Zapier app (manual via Zapier dashboard). 3 triggers (new conversation, new contact, custom event). 3 actions (send message, create contact, tag contact).

### [backend] WAPPY-18-10 — Webhook outbound service + delivery worker
- **Puntos**: 5
- **Descripción**:
  - Service que firma con HMAC y enqueue.
  - Worker BullMQ con retry exponencial.
  - Dead letter queue (tabla `webhook_failures`).
  - Endpoint `GET /api/v1/webhooks/:id/deliveries` para debugging.

### [backend] WAPPY-18-11 — Webhook playground
- **Puntos**: 2
- **Descripción**: Endpoint test `https://api.wappy.dev/webhooks/test/:token` que loguea recibido + responde 200. Cada workspace tiene 1 test endpoint.

### [qa] WAPPY-18-12 — Tests integrations
- **Puntos**: 5
- **Descripción**: Mock providers. OAuth flow happy path. Slack send mock. Shopify webhook handling.

### [cybersecurity] WAPPY-18-13 — Audit OAuth + webhooks
- **Puntos**: 5
- **Descripción**:
  - OAuth state param para CSRF.
  - Token storage cifrado.
  - Webhook URL: SSRF guard (no localhost, no IPs privadas).
  - HMAC strict.
  - Secret rotation supported.

---

## Métricas | Total story points | 51 |

## Notas

- Integrations en MVP: Slack + Shopify + Stripe + Zapier. Más en v2.
- Webhooks salientes son base para que clientes integren custom.
- Zapier publish puede tomar días en review. Submit early.
