# Wappy Backend — Planning

Roadmap operativo del backend de Wappy. Plataforma omnicanal multi-tenant con custom objects runtime (estilo Twenty CRM), self-service, automatización, AI y enterprise tier.

> **Audiencia**: este documento es para el equipo (1 founder + Claude subagents en worktrees paralelos). Los detalles por sprint viven en `sprints/`; las decisiones arquitectónicas en `adr/`; los roles en `roles.md`.

---

## Visión

Wappy es **una plataforma de soporte omnicanal y CRM extensible**. Compite con Intercom/Front en inbox, con Twenty/HubSpot en datos custom. Diferenciador: cada workspace define sus propios objetos, campos y relaciones; cada objeto expone REST + GraphQL automáticamente; multi-canal con WhatsApp BYO; AI con cap predecible por workspace.

**Modelo de negocio**: SaaS multi-tenant, facturación manual el primer año, planes Pro/Business/Enterprise con base flat + per-seat + AI metered.

---

## Stack locked

| Capa | Tecnología |
|---|---|
| Runtime | NestJS 11 + TypeScript 5.9 estricto |
| Persistencia | PostgreSQL + TypeORM 0.3 (**schema-per-tenant**) |
| Arquitectura | Hexagonal (ports & adapters) |
| Cache + Pub/Sub + Colas | Redis + BullMQ |
| Real-time | socket.io + `@socket.io/redis-adapter` |
| APIs | REST (Swagger auto-gen) + GraphQL (auto-gen desde metadata) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend (Free 3k/mo) detrás del port `MailProvider` |
| LLM | Local (Ollama/vLLM en GPU) primario + Anthropic Haiku 4.5 fallback |
| Observabilidad | nestjs-pino + Grafana + Loki + Prometheus + Tempo + Glitchtip self-hosted |
| CDN/DNS/TLS | Cloudflare (wildcard `*.wappy.dev` + Custom Hostnames en Enterprise) |
| Deploy | Railway (API + workers) + Cloudflare Pages (Help Center público) |

Ver `adr/` para el racional de cada decisión.

---

## Dominios

| Dominio | Uso |
|---|---|
| `wappy.dev` | Landing pública (no backend) |
| `app.wappy.dev` | Plataforma del agente (Next.js) — usa header `x-workspace-id` |
| `{slug}.wappy.dev` | Workspace del cliente — resolución por subdominio |
| `api.wappy.dev` | API directa para apps móviles y herramientas |
| `kb.{slug}.wappy.dev` | Help Center público por workspace |
| `book.{slug}.wappy.dev` | Booking público por workspace |
| `support.{cliente}.com` | White-label Enterprise (CNAME → Cloudflare Custom Hostname) |

---

## Roadmap visual

```
v1 — Plataforma core (Sprints 0-21, ~10-11 meses)
═══════════════════════════════════════════════════════════════════════
[S0]  Foundations & Infra
[S1]  Tenancy schema-per-tenant + DDL engine
[S2]  Auth + Plans + Billing manual + ModuleRegistry
[S3]  Metadata: Objects + Fields
[S4]  Metadata: Relations + Validations
[S5]  Auto-API: REST generator
[S6]  Auto-API: GraphQL + Views engine
[S7]  Contacts + Tags + Events
[S8]  Channels foundation + Widget SDK + Email channel
[S9]  Conversations + Messages + WebSockets + Real-time
[S10] Calendar/Booking + Help Center + SLA + Macros
[S11] Bot Builder + Engine
[S12] Automations + Rules Engine
[S13] Workflow Builder visual
[S14] Campaigns multi-canal + BullMQ pipelines
[S15] Comments + Mentions + Activity + Presence + Sharing
[S16] Analytics + Custom Dashboards + Reports
[S17] AI Copilot + Cap + AI sobre custom objects
[S18] Integrations + Webhooks salientes
[S19] Notifications + Preferences + Email digests
[S20] Templates verticales + Onboarding wizard
[S21] Hardening + Launch readiness                                ← BETA CERRADA

v1.1 — Enterprise (Sprints 22-26, ~3-4 meses)
═══════════════════════════════════════════════════════════════════════
[S22] SSO SAML + OIDC
[S23] SCIM provisioning + Audit log inmutable
[S24] White-label + Custom domain + TLS dinámico
[S25] Field-level encryption + Sandboxes
[S26] Marketplace MVP                                             ← GA ENTERPRISE

v2+ — Post-launch (Sprints 27+, según traction)
═══════════════════════════════════════════════════════════════════════
[S27] Mobile backend (push APNs/FCM + offline sync + identify)
[S28] AI generation + AI extraction + embeddings + RAG
[S29+] Approval workflows, field-level perms, custom JS sandbox,
       real-time co-editing CRDT, Stripe Billing, multi-region (EU),
       SOC2 prep, advanced WhatsApp templates...
```

---

## Cómo trabajamos

- **Sprints de 2 semanas** (10 días hábiles).
- **Solo founder + Claude subagents** en worktrees git paralelos. Tareas marcadas con `⟦parallel⟧` se pueden lanzar en simultáneo con subagents distintos.
- **Generadores Hygen obligatorios** para entidades sistema (`npm run generate:resource:relational`, `npm run add:property:to-relational`). Custom objects son runtime, NO se generan a mano.
- **Hexagonal estricto**: services dependen del port, nunca del adapter ni de la entidad TypeORM.
- **Code review propio antes de merge** (review por Claude). Sin PRs abiertos > 48h.
- **Definition of Done por tarea**: implementado + tests + i18n keys + docs si aplica + lint + types + e2e si aplica.
- **Definition of Done por sprint**: demo grabada (Loom o similar) + métricas verdes en Grafana + 0 P0/P1 abiertos.

---

## Convenciones de tarea

- IDs: `WAPPY-NN-XX` (sprint NN, tarea XX). Ejemplo `WAPPY-03-07`.
- Story points en escala Fibonacci: `1, 2, 3, 5, 8, 13`. Sobre 13 → dividir.
- Cada tarea tiene rol asignado, dependencias, descripción, criterios de aceptación.
- 8 roles: ver `roles.md`.

---

## Índice

- [`roles.md`](roles.md) — responsabilidades de los 8 roles
- [`modules-brief.md`](modules-brief.md) — los 60 features con tier MVP/v1.1/v2
- [`backlog.md`](backlog.md) — features diferidos a v1.1 y v2
- [`adr/`](adr/) — Architecture Decision Records (8 decisiones base)
- [`sprints/`](sprints/) — 27 archivos de sprint (0-26)

---

## Estado actual

**Sprint en curso**: ninguno (planning recién creado).
**Próximo**: Sprint 0 — Foundations.
**Fecha de inicio prevista**: a definir por el founder.
**Fecha estimada GA v1**: ~10-11 meses desde el inicio.
**Fecha estimada GA Enterprise (v1.1)**: ~14-15 meses desde el inicio.
