# Sprint 24 — White-label + Custom Domain + TLS dinámico

**Duración**: 2 semanas
**Objetivo**: Enterprise customer pone su propio dominio (`support.acmecorp.com`) con TLS auto-provisioned via Cloudflare Custom Hostnames. Branding override completo.
**Definition of Done del sprint**:
- Custom domain mapping (CNAME → Cloudflare → workspace).
- Cloudflare SaaS Custom Hostnames API integration.
- TLS provisioned automáticamente en minutos.
- Brand override: logo, colors, favicon, email from-address, widget chrome.
- DNS verification flow.

**Demo**: enterprise acmecorp añade `support.acmecorp.com`; sets CNAME en DNS; Wappy valida; TLS provisionado; access via URL custom; widget muestra branding Acme.

---

## Tareas

### [team-lead] WAPPY-24-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-24-11 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-24-02 — Diseño Custom Domain + Cloudflare Custom Hostnames
- **Puntos**: 5
- **Descripción**:
  - `CustomDomain` per workspace: hostname, sslStatus, validatedAt, cloudflareHostnameId.
  - Cloudflare for SaaS API integration.
  - DNS validation flow (TXT record o CNAME check).
  - Routing: request a `support.acmecorp.com` → backend resolve workspace by Custom Hostname → set TenantContext.

### [architect] WAPPY-24-03 — Diseño Branding override
- **Puntos**: 3
- **Descripción**:
  - WorkspaceBranding: logoFileId, faviconFileId, primaryColor, secondaryColor, fontFamily, customCss, widgetChromeOverride, emailFromName, emailFromAddress.
  - API endpoint `GET /api/v1/branding/public` (sin auth, para que widget público lo lea).

### [backend] WAPPY-24-04 — Cloudflare API client + Custom Hostname provisioning
- **Puntos**: 8
- **Descripción**:
  - Client wrapping CF for SaaS API.
  - Workflow: workspace add hostname → call CF API → store hostnameId → poll status → notify when SSL ready.
  - Handle errors (DNS not yet propagated, invalid hostname).

### [backend] WAPPY-24-05 — Custom Hostname middleware (alternative routing)
- **Puntos**: 5
- **Descripción**: Middleware antes del TenantResolver: chequea si Host header es custom hostname conocido → resolve workspace via CustomDomain lookup. Sino, fallback al subdomain resolution.

### [backend] WAPPY-24-06 — DNS verification flow
- **Puntos**: 3
- **Descripción**: Endpoint create custom domain → genera challenge TXT/CNAME → cliente añade en su DNS → Wappy polling verifica → mark validated.

### [backend] WAPPY-24-07 — Branding entity + endpoints + overrides
- **Puntos**: 5
- **Descripción**: CRUD branding. Public endpoint sin auth. Email templates respetan branding (from, footer). Widget config inyecta branding.

### [backend] WAPPY-24-08 — Auth domain awareness
- **Puntos**: 3
- **Descripción**: Cookies/sessions trabajan con custom domain. Email links incluyen custom domain del workspace.

### [qa] WAPPY-24-09 — Tests Custom Hostname
- **Puntos**: 5
- **Descripción**: E2E con mock Cloudflare API. Routing custom domain. Branding override.

### [cybersecurity] WAPPY-24-10 — Audit Custom Hostname (subdomain takeover, CSRF)
- **Puntos**: 3
- **Descripción**: Verify hostname before allowing. Cookie security on custom domains. CSRF cross-domain.

---

## Métricas | Total story points | 42 |
