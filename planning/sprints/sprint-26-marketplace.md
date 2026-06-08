# Sprint 26 — Marketplace MVP

**Duración**: 2 semanas
**Objetivo**: Ecosistema de apps third-party con manifest, OAuth provider Wappy, review queue manual.
**Definition of Done del sprint**:
- App entity + manifest schema.
- OAuth provider implementation (Wappy emite tokens).
- Install/uninstall flow per workspace.
- App permissions UI.
- App review queue (manual approval).
- Webhooks subscription model per App.

**Demo**: submit "Slack Sync App" via manifest; admin Wappy aprueba; workspace acme instala via OAuth flow; app recibe webhook event `conversation.created`; uninstall revoca todo.

**Esto cierra v1.1. GA Enterprise listo después de S26.**

---

## Tareas

### [team-lead] WAPPY-26-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-26-14 — Demo + GA Enterprise launch
- **Puntos**: 2

### [architect] WAPPY-26-02 — Diseño App + Manifest schema
- **Puntos**: 5
- **Descripción**:
  - `App` (id, name, slug, manifest jsonb, status pending|approved|rejected, ownerEmail, createdAt).
  - Manifest schema: name, description, icon, oauthScopes, webhookEvents, redirectUri, manifest version.
  - Validation strict.
  - `AppInstallation` per workspace: appId, workspaceId, accessToken, refreshToken, installedAt, uninstalledAt.

### [architect] WAPPY-26-03 — Diseño OAuth provider (Wappy es IdP)
- **Puntos**: 5
- **Descripción**:
  - OAuth 2.0 authorization code flow + PKCE.
  - Endpoints: `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`.
  - Scopes: granular `read:conversations`, `write:contacts`, `manage:webhooks`, etc.
  - Token rotation.

### [backend] WAPPY-26-04 — Generar App + AppInstallation
- **Puntos**: 3

### [backend] WAPPY-26-05 — OAuth provider implementation
- **Puntos**: 8
- **Descripción**: Endpoints + PKCE + token storage + scope enforcement en API requests.

### [backend] WAPPY-26-06 — App manifest validator + submission endpoint
- **Puntos**: 3
- **Descripción**: Endpoint `POST /api/v1/marketplace/apps` para developers. Valida manifest schema. Estado `pending`.

### [backend] WAPPY-26-07 — Admin review queue endpoints
- **Puntos**: 3
- **Descripción**: Endpoints admin: list pending, approve, reject (with reason). Email developer del status change.

### [backend] WAPPY-26-08 — Install flow per workspace
- **Puntos**: 5
- **Descripción**: Workspace admin browses approved apps. Install triggers OAuth flow. App receives token. Webhooks subscribed registered.

### [backend] WAPPY-26-09 — Uninstall + token revocation
- **Puntos**: 3
- **Descripción**: Revoke tokens. Unregister webhooks. Mark AppInstallation as uninstalled.

### [backend] WAPPY-26-10 — Webhooks per App
- **Puntos**: 3
- **Descripción**: App declara en manifest qué events quiere. Install registra webhooks. Events route to apps subscribed.

### [backend] WAPPY-26-11 — Public marketplace page (catalog)
- **Puntos**: 3
- **Descripción**: `marketplace.wappy.dev` con catálogo público de apps approved.

### [qa] WAPPY-26-12 — Tests Marketplace + OAuth
- **Puntos**: 5
- **Descripción**: Submit + approve + install + use API + uninstall. OAuth flow + token rotation + scope denial.

### [cybersecurity] WAPPY-26-13 — Audit OAuth provider + app permissions
- **Puntos**: 5
- **Descripción**: OAuth 2.0 best practices. Scope enforcement. Token leak prevention. Malicious app sandboxing.

---

## Métricas | Total story points | 54 |

## Notas

- Marketplace MVP es manual review. Revenue share manual.
- App review queue puede demorar (founder revisa). Documentar SLA público (5 business days).
- **GA Enterprise se anuncia después de este sprint.** Primer enterprise customer puede empezar a contratar.
- Después de S26: ~14 meses totales desde S0.
