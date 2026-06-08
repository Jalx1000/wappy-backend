# Sprint 19 — Notifications + Preferences + Email digests

**Duración**: 2 semanas
**Objetivo**: Centro de notificaciones in-app + preferencias granulares + email digest worker + prep push (placeholder hasta S27).
**Definition of Done del sprint**:
- Notification entity in-app.
- NotificationPreference matrix per-Member (event × channel).
- Email digest worker (daily/weekly).
- Push token storage (placeholder; envío real en S27).
- Unsubscribe links firmados.
- Throttling per-user.

**Demo**: trigger asignación → aparece notif en bell + email opcional según preferencia. Mutear tipo "campaign:sent" → no llegan más de ese tipo.

---

## Tareas

### [team-lead] WAPPY-19-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-19-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-19-02 — Diseño Notification + Preferences
- **Puntos**: 3
- **Descripción**:
  - `Notification` (workspaceId, memberId, type, payload jsonb, isRead, readAt, createdAt).
  - `NotificationPreference` (memberId, eventType, channels [string[]] in_app|email|push).
  - Defaults per eventType.
  - Throttling: max 1 notif del mismo tipo cada 5min.

### [backend] WAPPY-19-03 — Generar Notification + Preference
- **Puntos**: 3

### [backend] WAPPY-19-04 — NotificationsService + dispatcher
- **Puntos**: 5
- **Descripción**:
  - `dispatch({ memberId, type, payload })`: lee preferencias → fanout a canales configurados.
  - In-app: insert + emit WS `notification:new`.
  - Email: enqueue BullMQ con template.
  - Push: store token + enqueue (sin enviar en MVP).

### [backend] WAPPY-19-05 — Endpoints notifications + mark read
- **Puntos**: 3
- **Descripción**: `GET /api/v1/notifications?unread=true&cursor=`, `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`.

### [backend] WAPPY-19-06 — Preferences CRUD
- **Puntos**: 3
- **Descripción**: `GET/PUT /api/v1/me/notification-preferences`. UI matrix.

### [backend] WAPPY-19-07 — Email digest worker
- **Puntos**: 5
- **Descripción**: Worker cron diario 18h workspace timezone. Junta notifs del día per Member donde `email` está activo y prefiere digest. Render template HTML. Send via Mail provider.

### [backend] WAPPY-19-08 — Push tokens storage (placeholder)
- **Puntos**: 2
- **Descripción**: `PushToken` (memberId, token, platform ios|android, registeredAt). Endpoint para upload desde mobile. Envío real en S27.

### [backend] WAPPY-19-09 — Unsubscribe links firmados
- **Puntos**: 3
- **Descripción**: Cada email digest incluye link `https://api.wappy.dev/unsubscribe?token=...`. Token JWT firma `{memberId, eventType, signedAt}`. Endpoint marca preference off.

### [backend] WAPPY-19-10 — Integrar Automations + Workflows con dispatch
- **Puntos**: 3
- **Descripción**: Action `notify_member` (de S12) ahora ejecuta NotificationsService.dispatch real.

### [qa] WAPPY-19-11 — Tests Notifications
- **Puntos**: 5
- **Descripción**: Dispatch fanout, preferences matrix, throttling, digest grouping, unsubscribe.

---

## Métricas | Total story points | 37 |

## Notas

- Push real en S27 (mobile).
- Digest puede consumir mucho email free Resend; vigilar quota.
