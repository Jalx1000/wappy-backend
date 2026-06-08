# Sprint 02 — Auth + Plans + Billing manual + ModuleRegistry

**Duración**: 2 semanas
**Objetivo**: Sobre tenancy funcionando ([[ADR-001]]), construir identidad multi-tenant (Auth extendido), planes con trial 7d ([[ADR-005]]), y el ModuleRegistry con sus 5 capas de protección.
**Definition of Done del sprint**:
- Signup público crea Workspace + Admin Member + Subscription en trial 7d.
- Login resuelve workspace por subdominio o header; JWT incluye `workspaceId`.
- Cron diario suspende trials vencidos y workspaces sin pago.
- Admin del workspace puede desactivar módulos `system` con type-to-confirm.
- Endpoint a un módulo desactivado devuelve 404.
- Admin panel mínimo para founder marcar pagos.

**Demo**: signup desde dashboard → entrar a workspace → ver trial timer → como admin desactivar Products → endpoint `/api/v1/products` devuelve 404 → re-activar → vuelve 200.

**Riesgos**: complejidad del ModuleRegistry. Mitigación: empezar simple (sin cooldown 30d en este sprint, dejarlo para S21 hardening).

**Referencias**: [[ADR-005]] (billing manual), módulos del [[modules-brief.md]] capa 1.

---

## Tareas

### [team-lead] WAPPY-02-01 — Kickoff
- **Puntos**: 1
- **Depende de**: —
- **Descripción**: Revisar plan, asignar prioridades.

### [team-lead] WAPPY-02-16 — Demo + retro
- **Puntos**: 1
- **Depende de**: todas

### [architect] WAPPY-02-02 — Diseño extensión del Auth existente
- **Puntos**: 3
- **Depende de**: WAPPY-02-01
- **Descripción**: Diseñar cómo extender `src/auth/` (email/password, Google, Facebook) para multi-tenant:
  - JWT payload añade `workspaceId` + `role`.
  - Signup público: crea Workspace + Member (Admin).
  - Signup por invitación: une al workspace que invitó.
  - Login: resuelve workspace por context (Host) + valida que User pertenezca a ese workspace (vía Member).
  - Refresh token: mantiene workspaceId.
  - Pendiente para S22: SSO SAML/OIDC. NO implementar ahora.
- **Criterios de aceptación**:
  - [ ] Doc en `src/auth/MULTI_TENANT.md`.
  - [ ] Diagrama de flujos signup público vs invitación.
  - [ ] Decisión: ¿usar `WorkspaceMatchGuard` global o por endpoint? → global.

### [architect] WAPPY-02-03 — Diseño del ModuleRegistry + catálogo
- **Puntos**: 3
- **Depende de**: WAPPY-02-01
- **Descripción**: Diseñar:
  - Catálogo estático `src/module-registry/module-catalog.ts` con todos los módulos + tier + defaultEnabled.
  - Entidad `WorkspaceModule` (en core, no en tenant — para consultar rápido sin schema switch).
  - `ModuleEnabledGuard` global con decorador `@RequireModule('key')` en controllers.
  - Endpoint `POST /api/v1/workspace/modules/:key/{enable,disable}` con type-to-confirm.
  - Cooldown 30d → diferido a S21 (hardening), pero documentar diseño ahora.
- **Criterios de aceptación**:
  - [ ] Doc en `src/module-registry/README.md`.
  - [ ] Catálogo inicial con los 17 módulos del modules-brief listados.

### [backend] WAPPY-02-04 — Generar entidad Member con generator
- **Puntos**: 2
- **Depende de**: WAPPY-02-02
- **Descripción**: Usar `npm run generate:resource:relational -- --name Member` para generar el módulo Member. NOTA: Member vive en core schema (no en tenant) porque relaciona User (core) con Workspace (core). Añadir propiedades:
  - `npm run add:property:to-relational -- --name Member --property user --kind reference --type User --referenceType manyToOne --isAddToDto false --isOptional false`
  - `npm run add:property:to-relational -- --name Member --property workspace --kind reference --type Workspace --referenceType manyToOne --isAddToDto false --isOptional false`
  - `--property role --kind primitive --type string` (default 'agent', enum Admin/Agent validado en service)
  - `--property status --kind primitive --type string` (default 'active', enum active/invited/suspended)
  - `--property joinedAt --kind primitive --type Date`
- **Criterios de aceptación**:
  - [ ] Módulo `src/members/` generado con estructura Hexagonal.
  - [ ] Entidad creada, mapper, repo, service base.
  - [ ] Migration generada con `npm run migration:generate -- src/database/migrations/core/CreateMembers`.
  - [ ] Compuesta unique constraint `(workspaceId, userId)`.

### [backend] WAPPY-02-05 — Extender Auth con workspaceId en JWT
- **Puntos**: 5
- **Depende de**: WAPPY-02-04
- **Descripción**:
  - Modificar `JwtRefreshPayloadType` y `JwtPayloadType` en `src/auth/` para incluir `workspaceId` y `role`.
  - Modificar `AuthService.validateLogin` para resolver Member por (userId, workspaceId del context).
  - Si User no pertenece al workspace resuelto → 403.
  - `JwtStrategy.validate` carga Member + Role del cache (Redis).
  - `WorkspaceMatchGuard` aplicado globalmente: valida que el `workspaceId` del JWT === workspaceId del TenantContext.
- **Criterios de aceptación**:
  - [ ] JWT generado contiene `workspaceId` y `role`.
  - [ ] Login desde `acme.wappy.dev` con user de globant devuelve 403.
  - [ ] Token de acme usado en request a globant.wappy.dev devuelve 403.
  - [ ] Tests e2e: signup → login → request autenticado.

### [backend] WAPPY-02-06 — Signup público crea Workspace + Admin Member
- **Puntos**: 5
- **Depende de**: WAPPY-02-05
- **Descripción**: Endpoint `POST /api/v1/auth/signup` que recibe `{ email, password, name, workspaceName, workspaceSlug }`. Flow:
  1. Validar slug disponible.
  2. Crear `User` en core.
  3. Crear `Workspace` en core.
  4. Llamar `TenantSchemaManager.createSchema(slug)` + correr tenant migrations.
  5. Crear `Member` con role Admin.
  6. Crear `Subscription` (planId=Trial, trialEndsAt=now+7d).
  7. Enviar email de bienvenida (vía MailerModule existente, plantilla nueva).
  8. Devolver tokens.
- **Criterios de aceptación**:
  - [ ] Endpoint funcionando.
  - [ ] Test e2e completo del flujo.
  - [ ] Email de bienvenida llega a Maildev.
  - [ ] Si algo falla a mitad de flujo, rollback completo (transacción de Workspace + Member + Subscription; schema cleanup opcional).

### [backend] WAPPY-02-07 — Entidad Plan + Subscription + cron de expiración trial
- **Puntos**: 5
- **Depende de**: WAPPY-02-06
- **Descripción**:
  - Generar `Plan` (en core) con `npm run generate:resource:relational -- --name Plan`. Campos: `key` (Trial/Pro/Business/Enterprise), `name`, `pricePerMonthBase`, `pricePerAgent`, `limits` (jsonb: maxAgents, maxCustomObjects, aiUsdCap).
  - Generar `Subscription` (en core). Campos: `workspaceId` (FK), `planId` (FK), `status` (string enum), `trialEndsAt`, `currentPeriodStart`, `currentPeriodEnd`, `manuallyMarkedPaidUntil`.
  - Seeds: 4 planes (Trial/Pro/Business/Enterprise) con valores del [[adr/005]].
  - Cron job BullMQ que corre diario a las 00:00 UTC, evalúa subscriptions:
    - `trial` y `trialEndsAt < now()` → `past_due`.
    - `past_due` desde hace >7d → `suspended`.
    - `active` y `manuallyMarkedPaidUntil < now()` → `past_due`.
- **Criterios de aceptación**:
  - [ ] Entidades + migrations corriendo.
  - [ ] Seeds aplicados.
  - [ ] Cron funcional (test manual: setear trialEndsAt en pasado, correr job, verificar status).
  - [ ] `WorkspaceMatchGuard` extendido: si subscription suspended → 402.

### [backend] WAPPY-02-08 — Invitations + signup por invitación
- **Puntos**: 3
- **Depende de**: WAPPY-02-06
- **Descripción**: Generar `Invitation` (core). Campos: `workspaceId`, `email`, `role`, `token` (uuid), `expiresAt`, `acceptedAt?`. Endpoints:
  - `POST /api/v1/invitations` (admin envía invitación, manda email con link).
  - `POST /api/v1/auth/signup/invited` (con token + password + name).
- **Criterios de aceptación**:
  - [ ] Admin puede invitar a `nuevo@example.com` con rol Agent.
  - [ ] Email con link `https://acme.wappy.dev/accept-invite?token=...` llega.
  - [ ] Usuario completa signup → crea User + Member ya en workspace acme.

### [backend] WAPPY-02-09 — ModuleRegistry: catálogo + entidad + guard
- **Puntos**: 5
- **Depende de**: WAPPY-02-03
- **Descripción**:
  - `src/module-registry/module-catalog.ts` con los 17 módulos.
  - Entidad `WorkspaceModule` (core): workspaceId, moduleKey, isEnabled, settings jsonb, enabledAt, disabledAt, disabledByUserId.
  - Seed en signup: pre-popula con defaultEnabled del catálogo.
  - `ModuleEnabledGuard` global: lee TenantContext → busca WorkspaceModule en Redis cache → si no enabled, throw 404.
  - Decorator `@RequireModule('key')` para controllers.
- **Criterios de aceptación**:
  - [ ] Decorator funcionando.
  - [ ] Cache invalidado al toggle.
  - [ ] Test: marcar `helpcenter` disabled, request a `/api/v1/help-center/articles` → 404.

### [backend] WAPPY-02-10 — Endpoints toggle module + audit log básico
- **Puntos**: 3
- **Depende de**: WAPPY-02-09
- **Descripción**:
  - `POST /api/v1/workspace/modules/:key/enable` (Admin only).
  - `POST /api/v1/workspace/modules/:key/disable` body `{ confirmation: 'products' }` (Admin only, type-to-confirm).
  - Si moduleKey tier === `core` → 403 (no se puede desactivar).
  - Tabla `core.audit_log` minimal: workspaceId, actorMemberId, action, target, payload jsonb, occurredAt.
  - Cada toggle escribe entry.
- **Criterios de aceptación**:
  - [ ] Endpoints funcionando.
  - [ ] Type-to-confirm enforced.
  - [ ] Audit log con entries.
  - [ ] Cooldown 30d no implementado (diferido a S21, documentar).

### [backend] WAPPY-02-11 — Admin panel mínimo para founder (manual billing)
- **Puntos**: 3
- **Depende de**: WAPPY-02-07
- **Descripción**: Endpoints (auth con token admin sistema, NO de workspace):
  - `GET /api/v1/admin/workspaces` — lista todos los workspaces con su subscription status.
  - `POST /api/v1/admin/workspaces/:id/mark-paid` body `{ periodEnd: 'YYYY-MM-DD' }` — setea `manuallyMarkedPaidUntil`, cambia status a `active`.
  - `POST /api/v1/admin/workspaces/:id/change-plan` body `{ planKey }`.
  - Token admin: env var `ADMIN_API_TOKEN` (rotable).
- **Criterios de aceptación**:
  - [ ] 3 endpoints funcionando.
  - [ ] Auth con token verificada.
  - [ ] Logs visibles en Grafana.

### [qa] WAPPY-02-12 — Tests e2e flujo completo signup + login + cross-tenant
- **Puntos**: 5
- **Depende de**: WAPPY-02-06, WAPPY-02-05
- **Descripción**: Tests:
  - Signup `acme` → login → access `/api/v1/auth/me` ok.
  - Signup `globant` → login → access ok.
  - Token de `acme` usado contra `globant.wappy.dev` → 403.
  - Trial expirado → endpoints protegidos devuelven 402.
  - Signup con slug ya existente → 409.
  - Signup con slug inválido (`acme!@#`) → 400.
- **Criterios de aceptación**:
  - [ ] 6+ tests pasando.
  - [ ] Integrados a CI.

### [qa] WAPPY-02-13 — Tests del ModuleRegistry
- **Puntos**: 3
- **Depende de**: WAPPY-02-10
- **Descripción**: Tests:
  - Toggle `products` disabled → endpoint Products 404.
  - Toggle re-enable → 200 vuelve.
  - Toggle disable sin type-to-confirm → 400.
  - Toggle disable módulo `core` (auth) → 403.
  - Member rol Agent no puede toggle → 403.
- **Criterios de aceptación**:
  - [ ] 5 tests pasando.

### [cybersecurity] WAPPY-02-14 — Threat model Auth + Sessions
- **Puntos**: 3
- **Depende de**: WAPPY-02-05
- **Descripción**: Documentar `planning/threat-models/02-auth.md`:
  - Vectores: token reuse cross-tenant, JWT modification, brute force login, signup spam (rate limit), invitation token reuse, password reset attacks.
  - Mitigaciones: workspace check, JWT signature, throttler en login (5/min/IP), invitation single-use, password reset token short-lived.
  - Pendientes documentados (MFA, password complexity, etc. → v2).
- **Criterios de aceptación**:
  - [ ] Documento creado.
  - [ ] Throttler aplicado a `/auth/signup` y `/auth/login`.

### [devops] WAPPY-02-15 — Setup primer email template (welcome) en MailerModule
- **Puntos**: 2
- **Depende de**: WAPPY-02-06
- **Descripción**: Crear template Handlebars `welcome.hbs` en MailerModule existente. Llega a Maildev en dev. Variables: `{ workspaceName, agentName, ctaLink }`. Traducible (i18n keys).
- **Criterios de aceptación**:
  - [ ] Template existe y se renderiza.
  - [ ] Email visible en Maildev (`localhost:1080`).

---

## Métricas del sprint

| Métrica | Target |
|---|---|
| Total story points | 52 |
| Tareas backend | 8 |
| Tareas architect | 2 |
| Tareas qa | 2 |
| Tareas cybersecurity | 1 |
| Tareas devops | 1 |
| Tareas team-lead | 2 |

## Notas

- ModuleRegistry sin cooldown 30d en este sprint. Documentar como tech debt; cubrir en S21.
- El módulo Apple (`APPLE_APP_AUDIENCE` env var sigue ahí) fue removido en commit b03b3b8 pero env-example tiene dead config. Limpiar como parte de WAPPY-02-15 o tarea aparte.
- Stripe Billing intencionalmente fuera (ADR-005). Admin panel manual cubre necesidad.
