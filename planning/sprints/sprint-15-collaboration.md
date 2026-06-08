# Sprint 15 — Comments + Mentions + Activity + Presence + Sharing

**Duración**: 2 semanas
**Objetivo**: Capa colaborativa Notion-style sobre cualquier record. Activity log queda como historial. Real-time presence sobre records además de conversations.
**Definition of Done del sprint**:
- Comments polimórficos sobre cualquier record.
- @mentions con notification dispatch.
- ActivityLog per record con diff.
- Real-time presence en records (extiende lo de S9 que solo era convs).
- Share-via-link con tokens.

**Demo**: agente A abre Property #42; agente B también; ambos se ven en presence; A comenta y menciona a B; B recibe notif in-app y email.

---

## Tareas

### [team-lead] WAPPY-15-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-15-13 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-15-02 — Diseño Comment + ActivityLog polimórfico
- **Puntos**: 3
- **Descripción**:
  - `Comment` (targetType, targetId, authorMemberId, body, mentions jsonb [memberIds], replyToCommentId, createdAt, editedAt, deletedAt).
  - `ActivityLog` (targetType, targetId, actorMemberId, action create|update|delete, diff jsonb, occurredAt).
  - Polimorfismo: no FK porque target puede ser cualquier object. Validation en service.

### [backend] WAPPY-15-03 — Generar Comment
- **Puntos**: 2

### [backend] WAPPY-15-04 — CommentsService + endpoints
- **Puntos**: 3
- **Descripción**: CRUD. List by target. Validación target existe. Edit/soft delete.

### [backend] WAPPY-15-05 — Mentions parser + notification dispatch
- **Puntos**: 3
- **Descripción**: Parser regex `@username` en body. Resuelve a memberIds. Dispara Notification (S19 placeholder ok). Mention solo a Members del workspace.

### [backend] WAPPY-15-06 — Generar ActivityLog
- **Puntos**: 2

### [backend] WAPPY-15-07 — ActivityLog auto-tracking interceptor
- **Puntos**: 5
- **Descripción**: Interceptor TypeORM que captura insert/update/delete en objects sistema + custom. Calcula diff (vs estado previo). Persiste en activity_log. Retention 1 año.

### [backend] WAPPY-15-08 — Endpoint timeline por record
- **Puntos**: 2
- **Descripción**: `GET /api/v1/_activity/:targetType/:targetId?cursor=` paginated descending.

### [backend] WAPPY-15-09 — Real-time presence extendida (sobre records)
- **Puntos**: 3
- **Descripción**: Extiende lo de S9. WS event `record:join` con `{targetType, targetId}`. Redis `viewing:{type}:{id}` SET. Broadcast `presence:update`.

### [backend] WAPPY-15-10 — Share-via-link
- **Puntos**: 3
- **Descripción**: `ShareLink` (targetType, targetId, token uuid, expiresAt, requiresAuth, createdByMemberId, revokedAt). Endpoint create + revoke. Public viewer endpoint `GET /share/:token` valida + sirve datos read-only.

### [qa] WAPPY-15-11 — Tests Collaboration
- **Puntos**: 5
- **Descripción**: Comments CRUD, mentions resolution, activity log capture, presence multi-client, share-link expiry.

### [cybersecurity] WAPPY-15-12 — Audit polimorfismo + share-links
- **Puntos**: 3
- **Descripción**: Polimorfismo: validar que targetId pertenece al workspace (sino info disclosure). Share-link: tokens cryptographically random. Revocation immediate.

---

## Métricas | Total story points | 36 |

## Notas

- Activity log es gran feature de compliance enterprise. En MVP retention 1 año; v1.1 extiende a configurable.
- Presence se acumula con la implementación de S9 (conversations). Mismo Redis pattern, distinto namespace.
- Favorites + co-editing CRDT son v1.1/v2.
