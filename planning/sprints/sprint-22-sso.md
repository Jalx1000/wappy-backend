# Sprint 22 — SSO SAML + OIDC

**Duración**: 2 semanas
**Objetivo**: Identidad enterprise. SAML 2.0 + OIDC con JIT provisioning. Enterprise customer puede mandar a su IdP (Okta, Azure AD, Google Workspace) sin email/password.
**Definition of Done del sprint**:
- SAML 2.0 SP implementation (passport-saml).
- OIDC flow.
- IdP-initiated SSO.
- JIT user/member provisioning.
- Role mapping desde IdP attributes/groups.
- Disable email/password per workspace si SSO obligatorio.

**Demo**: configurar Okta SAML para workspace acme-corp; agente clickea "Login with Okta"; auto-creado en Wappy con role mapeado de Okta group.

---

## Tareas

### [team-lead] WAPPY-22-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-22-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-22-02 — Diseño SSO config + JIT provisioning
- **Puntos**: 5
- **Descripción**:
  - `SsoConfig` per workspace (provider saml|oidc, settings jsonb cifrado, isRequired, role mapping rules).
  - JIT: si user no existe, crear User + Member con role mapeado.
  - SAML: SP-initiated + IdP-initiated.
  - OIDC: PKCE flow.

### [backend] WAPPY-22-03 — Generar SsoConfig
- **Puntos**: 2

### [backend] WAPPY-22-04 — SAML 2.0 implementation (passport-saml)
- **Puntos**: 8
- **Descripción**:
  - Install `@node-saml/passport-saml`.
  - Endpoint `POST /api/v1/sso/saml/:workspaceSlug/login` (SP-initiated).
  - Endpoint `POST /api/v1/sso/saml/:workspaceSlug/acs` (Assertion Consumer Service).
  - Metadata endpoint `GET /api/v1/sso/saml/:workspaceSlug/metadata`.
  - JIT provisioning.

### [backend] WAPPY-22-05 — OIDC implementation
- **Puntos**: 5
- **Descripción**: PKCE flow. Endpoints similar a SAML.

### [backend] WAPPY-22-06 — Role mapping engine
- **Puntos**: 3
- **Descripción**: Rules: si IdP attribute `groups` contiene `wappy-admin` → role Admin. Configurable JSON per workspace.

### [backend] WAPPY-22-07 — IdP-initiated SSO
- **Puntos**: 3
- **Descripción**: IdP redirige directamente al ACS sin SP-initiated request. Handle relayState.

### [backend] WAPPY-22-08 — Force SSO config (disable email/password)
- **Puntos**: 3
- **Descripción**: Workspace setting `requireSso=true`. Login email/password rechazado con redirect a SSO.

### [backend] WAPPY-22-09 — CRUD endpoints SsoConfig (Admin only)
- **Puntos**: 3

### [qa] WAPPY-22-10 — Tests SSO con SimpleSAMLphp test IdP
- **Puntos**: 5
- **Descripción**: Levantar SimpleSAMLphp en docker para tests. SAML flow happy + JIT + force SSO.

### [cybersecurity] WAPPY-22-11 — Audit SSO
- **Puntos**: 5
- **Descripción**: Signature validation strict. Replay attacks (NotOnOrAfter). RelayState validation. Open redirect prevention.

---

## Métricas | Total story points | 44 |
