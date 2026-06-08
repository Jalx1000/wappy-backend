# Sprint 21 — Hardening + Launch readiness

**Duración**: 2 semanas
**Objetivo**: Production-ready para primer cliente pagando. Performance, seguridad, ops, docs. **Beta cerrada al final.**
**Definition of Done del sprint**:
- Rate limit fine-tuned per plan.
- Cooldown 30d implementado (drop columns reales del Metadata).
- Audit log retention enforced + cron purga.
- Load test simulando 30 workspaces × 100 conv/día verde.
- Security audit OWASP Top-10 completo.
- Pentest del widget público.
- Runbooks: incidentes, DB recovery, secret rotation.
- Status page operativa.
- Docs site público.
- **First paying customer onboarded**.

**Demo**: load test report, status page live, primer cliente paga $39/mes.

---

## Tareas

### [team-lead] WAPPY-21-01 — Kickoff + beta plan
- **Puntos**: 1
- **Descripción**: Plan de beta cerrada: 10 clientes invitados (founder's network), onboarding white-glove, feedback weekly.

### [team-lead] WAPPY-21-19 — Demo + retro + LAUNCH
- **Puntos**: 2
- **Descripción**: Demo final completa del producto. Onboard first customer en vivo. Retro v1 entero.

### [devops] WAPPY-21-02 — Fine-tune rate limits per plan
- **Puntos**: 3
- **Descripción**: Revisar todos los rate limits, ajustar per plan tier. Documentar en `docs/rate-limits.md`.

### [backend] WAPPY-21-03 — Cooldown 30d cron (drop columns + tables reales)
- **Puntos**: 5
- **Descripción**: Cron diario que purga columns/tables marcadas deletedAt + 30d. Antes notif al admin al día 28. Hard `DROP COLUMN` / `DROP TABLE` real.

### [backend] WAPPY-21-04 — Audit log retention + purge
- **Puntos**: 3
- **Descripción**: Cron weekly purga audit log older than retention configurada per plan. Pro 90d, Business 1y, Enterprise 2y+.

### [backend] WAPPY-21-05 — Module cooldown 30d (data permanently delete)
- **Puntos**: 3
- **Descripción**: Mismo patrón: módulo disabled >30d → opción "Permanently delete data" en UI admin. Cron job ejecuta drops.

### [devops] WAPPY-21-06 — Production deployment Railway
- **Puntos**: 5
- **Descripción**: Setup completo: services (API + workers + Glitchtip), Postgres, Redis, env vars, secrets, custom domain `api.wappy.dev`, monitoring.

### [devops] WAPPY-21-07 — Cloudflare prod config (wildcard, R2 prod, custom hostnames placeholder)
- **Puntos**: 3
- **Descripción**: DNS prod. R2 buckets prod. Page Rules para help center caching.

### [devops] WAPPY-21-08 — Status page + uptime monitoring
- **Puntos**: 3
- **Descripción**: Status.wappy.dev (Uptime Kuma público o Statusly). Monitoreo de `/health` + `/ready` + endpoints públicos clave.

### [devops] WAPPY-21-09 — Runbooks
- **Puntos**: 5
- **Descripción**: Documentar:
  - Incident response (severity matrix, escalation).
  - DB recovery (restore from R2 backup).
  - Secret rotation (JWT, R2, Anthropic).
  - Workspace migration (manual schema move).
  - Performance debugging.

### [devops] WAPPY-21-10 — Docs site público (Cloudflare Pages)
- **Puntos**: 3
- **Descripción**: `docs.wappy.dev` con guides: getting started, widget install, API reference, integrations, FAQ.

### [qa] WAPPY-21-11 — Load test full system
- **Puntos**: 8
- **Descripción**: artillery scenarios:
  - 30 workspaces concurrent.
  - 100 conv/day per workspace.
  - 500 messages/min total.
  - 50 WS connections per workspace.
  - 100 API requests/sec.
- Targets: p95 < 500ms, no errores.

### [qa] WAPPY-21-12 — Regression suite completa
- **Puntos**: 5
- **Descripción**: Ensure todos los tests e2e de cada sprint corren en CI. Suite full ~30 min. Required check para deploy.

### [cybersecurity] WAPPY-21-13 — OWASP Top-10 audit
- **Puntos**: 8
- **Descripción**: Review formal de cada categoría:
  - Injection (SQL via metadata, NL→SQL): cubierto.
  - Broken auth: cubierto.
  - Sensitive data exposure: encryption at rest revisar.
  - XXE: no aplica.
  - Broken access control: re-test cross-tenant.
  - Security misconfiguration: helmet defaults, CORS, headers.
  - XSS: stored XSS en custom fields, mensajes.
  - Insecure deserialization: jsonb deserialization safety.
  - Components with known vulns: `npm audit` clean.
  - Insufficient logging: audit log adequacy.

### [cybersecurity] WAPPY-21-14 — Pentest widget público
- **Puntos**: 5
- **Descripción**: Widget es endpoint público más expuesto. Pentest:
  - Token forgery.
  - CORS bypass.
  - Spam (1000 conv/sec).
  - Inject XSS via initialMessage.
  - File upload attacks.

### [cybersecurity] WAPPY-21-15 — Secret rotation drill
- **Puntos**: 2
- **Descripción**: Practice: rotar JWT secret en prod sin downtime. Documentar.

### [data-analyst] WAPPY-21-16 — Launch metrics dashboard
- **Puntos**: 3
- **Descripción**: Grafana dashboard para founder:
  - Signups per day, conversion trial→paid, churn, MRR, NPS de beta, ticket volume, top errors.

### [meta-developer] WAPPY-21-17 — WhatsApp BSP setup (si necesario)
- **Puntos**: 2
- **Descripción**: Verificar Meta Business verification de Wappy para si algún cliente lo necesita usar (mientras no sean BYO).

### [backend] WAPPY-21-18 — Bug bash + cleanup tech debt P1
- **Puntos**: 5
- **Descripción**: Resolver tech debt acumulado de los 20 sprints anteriores. Limpiar `APPLE_APP_AUDIENCE` orfanado, dead code, TODOs.

---

## Métricas | Total story points | 74 |

## Notas

- **Sprint más pesado del MVP** (74 pts). Equivale a Sprint 1.5 de tamaño normal.
- 74 pts es ambicioso. Si slip, pasar parte a S22 (post-launch hardening).
- Foco principal: **demonstrable production readiness**. No es sprint de features, es de polish.
- **Beta launch al final**. Stripe NO está; facturación manual.
