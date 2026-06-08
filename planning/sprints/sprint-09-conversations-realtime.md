# Sprint 09 — Conversations + Messages + WebSockets + Real-time

**Duración**: 2 semanas
**Objetivo**: El inbox propiamente dicho. Multi-instancia (Redis adapter para socket.io). Eventos real-time completos.
**Definition of Done del sprint**:
- Conversation + Message entities + ConversationAgent pivot multi-asignee.
- States open/snoozed/resolved + priority + assigned.
- Internal notes (isPrivate=true).
- Attachments via R2 presigned URLs.
- WebSocket gateway en `/rt` con Redis adapter (multi-instancia).
- Eventos: message:new, message:read, typing:*, conversation:assigned, conversation:status.
- Co-presence en conversation tracked en Redis.

**Demo**: 2 tabs browser inbox abierto en conv X; agente 1 escribe → agente 2 ve typing → agente 1 envía → agente 2 recibe message:new; asignar conv → ambos ven update.

**Riesgos**: WS multi-instancia es complejo (sticky vs Redis adapter). Mitigación: Redis adapter desde día 1, test con 2 réplicas en docker compose.

---

## Tareas

### [team-lead] WAPPY-09-01 — Kickoff + load test target definition
- **Puntos**: 1
- **Descripción**: Definir target: 100 agents concurrent per workspace, 500 messages/min sin lag.

### [team-lead] WAPPY-09-16 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-09-02 — Diseño Conversation/Message/ConversationAgent
- **Puntos**: 5
- **Descripción**:
  - `Conversation` (contactId, channelAccountId, status, priority, snoozedUntil, slaDueAt, firstResponseAt, lastMessageAt, summary).
  - `Message` (conversationId, authorType, authorId, content, attachments jsonb, isPrivate, channelMessageId, deliveredAt, readAt).
  - `ConversationAgent` pivot (conversationId, memberId, role primary|collaborator, assignedAt).
  - State machine: open ↔ snoozed ↔ resolved transitions.

### [architect] WAPPY-09-03 — Diseño WS gateway + room strategy
- **Puntos**: 3
- **Descripción**:
  - Namespace `/rt`.
  - Rooms: `ws:{wsId}:workspace` (broadcasting), `ws:{wsId}:conv:{convId}` (per-conv), `ws:{wsId}:member:{memberId}` (personal).
  - Auth en handshake: JWT.
  - Redis adapter config.
  - Heartbeat strategy para presence.

### [backend] WAPPY-09-04 — Generar Conversation + Message + ConversationAgent
- **Puntos**: 5
- **Descripción**: Hygen generators. Tablas en tenant schema. Registrar en `_meta_objects` con isSystem=true.

### [backend] WAPPY-09-05 — ConversationsService + state machine
- **Puntos**: 5
- **Descripción**: Transitions enforced. Endpoints CRUD + custom (assign, unassign, snooze, resolve, reopen).

### [backend] WAPPY-09-06 — MessagesService + attachment handling
- **Puntos**: 5
- **Descripción**: Create message (con attachments referenciando R2 file_id). Mark as read endpoint. Private notes flag.

### [backend] WAPPY-09-07 — Attachments R2 presigned URL endpoints
- **Puntos**: 3
- **Descripción**:
  - `POST /api/v1/attachments/upload-url` body `{ filename, mimeType, size, targetType, targetId }` → genera presigned URL upload con MIME whitelist.
  - `GET /api/v1/attachments/:id/download-url` → presigned URL download con check de propiedad.

### [backend] WAPPY-09-08 — WebSocket gateway con socket.io + Redis adapter
- **Puntos**: 8
- **Descripción**: Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@socket.io/redis-adapter`. Gateway en `/rt`. JWT auth handshake. Auto-join workspace room + relevant convs.

### [backend] WAPPY-09-09 — Eventos: message:new, typing:*, conversation:*
- **Puntos**: 5
- **Descripción**: Emit en service hooks. Subscriptions handle en gateway.

### [backend] WAPPY-09-10 — Co-presence en Redis
- **Puntos**: 3
- **Descripción**: Cuando member entra a conv → `SADD conv:{id}:viewers {memberId} EX 30`. Heartbeat refresca. Broadcast `presence:update` al room.

### [qa] WAPPY-09-11 — Tests e2e Conversations + Messages
- **Puntos**: 5
- **Descripción**: CRUD + assign + state transitions + private notes + attachments.

### [qa] WAPPY-09-12 — Tests WS multi-instancia
- **Puntos**: 5
- **Descripción**: Docker compose con 2 réplicas API. Cliente conecta a réplica A, otro a B. Mensaje enviado en A llega a B. Test co-presence cross-instance.

### [qa] WAPPY-09-13 — Load test WS (100 concurrent, 500 msg/min)
- **Puntos**: 5
- **Descripción**: artillery o k6 con WS support. Target del WAPPY-09-01.

### [cybersecurity] WAPPY-09-14 — Audit WS auth + attachments
- **Puntos**: 3
- **Descripción**: JWT en handshake validado. Room auth (no join cross-workspace). Attachments path workspace-scoped. MIME whitelist enforced.

### [devops] WAPPY-09-15 — Configurar bucket R2 prod + lifecycle policies
- **Puntos**: 2
- **Descripción**: `wappy-attachments-prod` con lifecycle: temp uploads borrados 7d. Backups bucket separado.

---

## Métricas | Total story points | 64 |

## Notas

- **Hito de producto**: después de S9, Wappy tiene un inbox funcional. Beta interna posible desde acá.
- WhatsApp/IG channel todavía no, pero infra está lista para conectarlos.
- Eventos `/rt` los consumirán el frontend (inbox) Y el widget (cliente final).
