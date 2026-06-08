# Sprint 23 — SCIM provisioning + Audit log inmutable extendido

**Duración**: 2 semanas
**Objetivo**: Lifecycle automation enterprise. Okta/Azure AD provisiona users automáticamente. Audit log append-only con 2+ años retention y export SIEM.
**Definition of Done del sprint**:
- SCIM 2.0 endpoints completos (Okta/Azure AD compatibles).
- Audit log inmutable (append-only enforced).
- Export a SIEM (JSONL stream).
- Advanced filtering en audit log.

**Demo**: Okta provisiona 50 users a workspace → aparecen en Members; deactivar user en Okta → suspended en Wappy; export audit log día → archivo JSONL.

---

## Tareas

### [team-lead] WAPPY-23-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-23-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-23-02 — Diseño SCIM endpoints + mapping
- **Puntos**: 3
- **Descripción**:
  - Endpoints SCIM 2.0: `/scim/v2/Users`, `/scim/v2/Groups`.
  - Auth: SCIM token per workspace (bearer).
  - Mapping SCIM User → Wappy User+Member.
  - Group → Role mapping rules.

### [backend] WAPPY-23-03 — Implementar SCIM /Users endpoints
- **Puntos**: 8
- **Descripción**: GET (list, filter), GET :id, POST (create), PUT :id (replace), PATCH :id (partial), DELETE :id. Spec SCIM 2.0 estricto.

### [backend] WAPPY-23-04 — Implementar SCIM /Groups endpoints
- **Puntos**: 5
- **Descripción**: Similar. Group operations.

### [backend] WAPPY-23-05 — SCIM token auth + per-workspace config
- **Puntos**: 3
- **Descripción**: `ScimConfig` per workspace. Token generation + rotation. Endpoint admin para regenerar.

### [backend] WAPPY-23-06 — Audit log inmutable (append-only constraint)
- **Puntos**: 5
- **Descripción**:
  - Tabla `core.audit_log_immutable` con trigger Postgres que rechaza UPDATE/DELETE.
  - Migrar el `audit_log` actual a este modelo.
  - Retention per plan (Pro 90d, Business 1y, Enterprise 2y+).

### [backend] WAPPY-23-07 — Advanced filtering en audit log
- **Puntos**: 3
- **Descripción**: Endpoint `GET /api/v1/audit-log?actor=...&target=...&action=...&from=...&to=...` con pagination cursor.

### [backend] WAPPY-23-08 — Export audit log to SIEM (JSONL stream)
- **Puntos**: 5
- **Descripción**:
  - Endpoint `GET /api/v1/audit-log/export?from=...&to=...&format=jsonl` que stream-pea (no carga en memoria).
  - Workspace puede configurar webhook SIEM que recibe entries en real-time.

### [qa] WAPPY-23-09 — Tests SCIM con Okta sandbox
- **Puntos**: 5
- **Descripción**: Si posible, conectar Okta sandbox real. Sino, mock SCIM client tests.

### [qa] WAPPY-23-10 — Tests audit log inmutabilidad
- **Puntos**: 3
- **Descripción**: Verificar que UPDATE/DELETE fallan a nivel DB. Export stream funciona con datasets grandes.

### [cybersecurity] WAPPY-23-11 — Audit SCIM + audit log
- **Puntos**: 5
- **Descripción**: SCIM token storage + scope. Audit log: ¿se puede manipular vía SQL? ¿migración escape la inmutabilidad?

---

## Métricas | Total story points | 47 |
