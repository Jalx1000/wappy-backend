# Sprint 08 — Channels foundation + Widget SDK API + Email channel

**Duración**: 2 semanas
**Objetivo**: Infra multi-canal + 2 primeros canales activos (Web Widget + Email). WhatsApp Cloud entra en S14. Widget SDK API endpoints públicos listos para que frontend snippet los consuma.
**Definition of Done del sprint**:
- ChannelAccount con credenciales cifradas per-workspace.
- Widget SDK endpoints públicos: init, identify, conversations, messages.
- Email channel inbound (Resend webhook) + outbound (Resend Free).
- Threading de email por reply-token.
- HMAC verification de webhooks Resend.

**Demo**: embeber snippet del widget en página de prueba; conversación arranca; agente responde; cliente recibe email; cliente responde por email → aparece en mismo hilo.

**Riesgos**: encryption per-workspace key requiere KMS strategy. Mitigación: usar `crypto` Node con key derivada de `AUTH_JWT_SECRET + workspaceId` en MVP, KMS real en v1.1.

**Referencias**: módulos Channels + Widget SDK + Email del [[modules-brief.md]].

---

## Tareas

### [team-lead] WAPPY-08-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-08-14 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-08-02 — Diseño Channel + ChannelAccount + encryption strategy
- **Puntos**: 5
- **Descripción**:
  - `Channel` (id, type enum [web|email|whatsapp|messenger|instagram], name, isActive).
  - `ChannelAccount` (channelId, externalId, credentials jsonb cifrado, webhookSecret, isActive).
  - Encryption: AES-256-GCM con key derivada per-workspace (HKDF de master + workspaceId). Para v1.1 → KMS.
  - Webhook routing strategy.

### [architect] WAPPY-08-03 — Diseño Widget SDK API contract
- **Puntos**: 3
- **Descripción**: Endpoints públicos:
  - `POST /widget/v1/init` body `{ workspaceApiKey }` → devuelve config (branding, channels enabled, contactToken efímero).
  - `POST /widget/v1/identify` body `{ contactToken, attributes }`.
  - `POST /widget/v1/conversations` body `{ contactToken, initialMessage }`.
  - `GET /widget/v1/conversations/:id/messages` con paginated.
  - `POST /widget/v1/messages` body `{ conversationToken, body, attachments }`.
  - Token efímero (24h TTL) firmado JWT scoped a workspace + contact.

### [backend] WAPPY-08-04 — Generar Channel + ChannelAccount con encryption
- **Puntos**: 5
- **Descripción**: Generators Hygen. Service con encrypt/decrypt en hooks. Key derivation con HKDF.

### [backend] WAPPY-08-05 — Widget SDK endpoints públicos
- **Puntos**: 5
- **Descripción**: Controller `src/widget-api/` con los 5 endpoints. Auth con `workspaceApiKey` o `contactToken`. CORS dinámico (validar Origin contra workspace settings).

### [backend] WAPPY-08-06 — Web Widget channel
- **Puntos**: 3
- **Descripción**: ChannelAccount type=web auto-creada al setup workspace. No requiere config. Conversaciones del widget llegan acá.

### [backend] WAPPY-08-07 — Email channel inbound (Resend webhook)
- **Puntos**: 5
- **Descripción**:
  - Endpoint `POST /webhooks/email/inbound` recibe webhook Resend.
  - Verifica HMAC.
  - Parsea email (subject, from, body, attachments, In-Reply-To, References).
  - Threading: si In-Reply-To matches conversation token → append message. Else nueva conversation.
  - Worker BullMQ procesa async para no bloquear webhook.

### [backend] WAPPY-08-08 — Email channel outbound (Resend send)
- **Puntos**: 3
- **Descripción**: ResendAdapter detrás del port `MailProvider` (extiende el existente). Cada conversation tiene reply-to único `{convToken}@reply.wappy.dev`. Outbound desde inbox dispara send.

### [backend] WAPPY-08-09 — MAIL_PROVIDER switcher (smtp dev / resend prod)
- **Puntos**: 2
- **Descripción**: ENV `MAIL_PROVIDER=smtp|resend`. Smtp usa nodemailer + maildev en dev. Resend en prod.

### [qa] WAPPY-08-10 — Tests e2e Widget SDK
- **Puntos**: 5
- **Descripción**: Init → identify → create conv → send message → list messages. Edge cases: token expirado, wrong workspace, CORS.

### [qa] WAPPY-08-11 — Tests Email channel
- **Puntos**: 5
- **Descripción**: Inbound parsing (HTML + plain + attachments). Threading. Outbound. HMAC verification fail = 401.

### [cybersecurity] WAPPY-08-12 — Audit Widget API + Email webhooks
- **Puntos**: 5
- **Descripción**: Widget es endpoint público — vector de ataque mayor. Audit:
  - Rate limit estricto per workspaceApiKey + per IP.
  - Validation de attachments (MIME, size).
  - CORS no permisivo (no `*`).
  - Email HMAC strict.
  - Anti-spam: detect contact creando 100 conversations/min.

### [devops] WAPPY-08-13 — Setup wildcard DNS + dominio reply
- **Puntos**: 2
- **Descripción**: Configurar en Cloudflare:
  - Wildcard `*.wappy.dev` proxied.
  - `reply.wappy.dev` MX → Resend.
  - SPF, DKIM, DMARC del dominio.

---

## Métricas | Total story points | 50 |

## Notas

- WhatsApp Cloud no se conecta en este sprint. Se hace stub si el widget necesita conversation desde un canal "WhatsApp" para testing.
- Messenger/IG son v2.
- En este sprint se introduce primer endpoint público (Widget API). Cybersec es crítico.
