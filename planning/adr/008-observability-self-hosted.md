# ADR 008 — Observabilidad self-hosted con Grafana stack

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + devops

## Contexto

Wappy necesita observabilidad: logs estructurados, métricas, traces, error tracking, uptime monitoring. Hay que decidir entre SaaS managed (Sentry + Better Stack + Datadog) o self-hosted (Grafana stack + Glitchtip + Uptime Kuma).

Factores:
- Budget MVP ajustado (founder solo).
- Datos sensibles de clientes pueden filtrar a logs (PII en mensajes) → preferible no enviar a tercero.
- Founder tiene experiencia ops aceptable.

## Decisión

**Adoptamos observabilidad self-hosted con Grafana stack desde S0**. Se levanta como compose separado (`docker-compose.observability.yaml`) que se puede apagar en dev sin afectar la API.

### Stack

- **Logs**: `nestjs-pino` → JSON a stdout → **Promtail** o **Grafana Alloy** → **Loki** (storage) → **Grafana** (UI).
- **Métricas**: **Prometheus** scrappea `/metrics` endpoint expuesto por la API (vía `@willsoto/nestjs-prometheus`). Visualización en Grafana.
- **Traces**: **Tempo** recibe spans OTLP. Instrumentación con `@opentelemetry/auto-instrumentations-node`.
- **Errores**: **Glitchtip** (Sentry-compatible, open source, Django + Postgres). El SDK `@sentry/node` apunta al DSN de Glitchtip y funciona idéntico.
- **Uptime**: **Uptime Kuma** monitorea `/health`, `/ready`, endpoints públicos clave (`https://wappy.dev`, `https://app.wappy.dev`, status page).
- **Alertas**: Grafana Alerting → notifica a un canal Slack/Discord/Telegram + email del founder.

### Despliegue

- **Dev**: `docker compose -f docker-compose.observability.yaml up -d` levanta todo. Acceso local en puertos:
  - Grafana: `:3001`
  - Loki: `:3100`
  - Prometheus: `:9090`
  - Tempo: `:3200`
  - Glitchtip: `:9000`
  - Uptime Kuma: `:3002`
- **Prod**:
  - **Opción A (recomendada para MVP)**: VPS dedicado de $5-10/mo (Hetzner, Contabo) con docker compose. Aislado de la API.
  - **Opción B**: Servicios Railway separados. Más caros pero menos ops.
  - Acceso restringido por Cloudflare Access (zero trust) o WireGuard.

### Configuración base

- **Pino**: structured logs JSON con `req_id`, `workspace_slug` (cuando aplique), redacción de campos sensibles (`password`, `token`, `apiKey`, `accessToken`).
- **Métricas custom**:
  - `wappy_http_request_duration_seconds` (histogram, label: route + method + status)
  - `wappy_workspace_count` (gauge)
  - `wappy_active_websocket_connections` (gauge, label: workspace_slug)
  - `wappy_bullmq_job_duration_seconds` (histogram, label: queue + status)
  - `wappy_llm_tokens_used` (counter, label: workspace_slug + provider)
- **Sampling**:
  - Logs: todos en dev, INFO+ en prod.
  - Traces: 5% sample en prod, 100% en dev.
- **Retention**:
  - Loki: 30 días en MVP (subir a 90 cuando importe).
  - Prometheus: 30 días.
  - Tempo: 14 días.
  - Glitchtip: 90 días.

## Consecuencias

### Positivas

- **Costo cero recurrente** (más allá del VPS $5-10/mo). Sentry Team = $26/mo, BetterStack = $25/mo, Datadog = $$$ ya sumando $50+/mo solo para empezar.
- **Privacy story strong**: ningún log/error/trace sale a tercero. PII de clientes nunca cruza la línea.
- **Customización total**: Grafana dashboards exactos al producto, alertas en idioma propio, etc.
- **Skill development**: founder aprende observability profundo — útil de por vida.
- **Mismo stack que Twenty, Cal.com, etc.**: comunidad grande, lots of dashboards prefab.

### Negativas

- **Ops burden real**: cuando un servicio cae, founder debuggea. Loki se llena → cleanup. Disk full → escalado.
- **Sin alguien on-call 24/7**: alerta de noche = founder duerme con teléfono ruidoso.
- **VPS más para mantener**: parches, upgrades, security.
- **Debug del debug**: si Grafana mismo falla, no hay observabilidad de la observabilidad.
- **Setup inicial es 1-2 días** vs 1 hora con SaaS.
- **Glitchtip menos pulido que Sentry**: features menos avanzados (no breadcrumbs ricos, no replay sessions).

### Mitigaciones

- **Compose declarativo + versioned**: el stack se reproduce en minutos. Backup de Grafana dashboards + alert rules en repo.
- **Disk monitoring** + cleanup automático (logs > 30d se borran).
- **Healthchecks de los healthcheckers**: Uptime Kuma monitorea a Grafana y vice versa. Si ambos caen, hay un cron externo en el VPS que pinga al founder.
- **Backup nightly de Glitchtip Postgres** a R2 (`wappy-backups-prod`).
- **Escape hatch documentado**: ADR-008-bis (futuro) cuando migrar a SaaS si duele demasiado. Migración Loki → Grafana Cloud Free, Glitchtip → Sentry, Uptime Kuma → Better Stack es mecánica.

## Alternativa rechazada: SaaS managed desde día 1

Sentry + Better Stack + Grafana Cloud Free. Razones de rechazo:

- $50-100/mo en estado base (sobre $20 Railway + costo Anthropic + R2 + dominio). Material para MVP solo.
- Logs con PII viajan a tercero. Liability adicional.
- Lock-in mayor — SDK específicos.

Se reconsiderará en v1.1 si el ops burden del stack self-hosted reduce velocity > 4h/semana del founder.

## Alternativa rechazada: solo Railway logs

Railway tiene logs y métricas básicas. Razones de rechazo:

- Sin búsqueda full-text en logs.
- Sin agregaciones / dashboards.
- Sin alerting custom.
- Pierdes logs al cabo de horas.
- Útil solo en startup phase muy temprana, ya pasamos.

## Referencias

- Grafana Labs `grafana/loki` repo.
- Glitchtip docs + Sentry SDK compatibility.
- Uptime Kuma GitHub.
- Cal.com, Plausible: ejemplos de OSS SaaS con Grafana stack en prod.

## Notas

Este stack es el segundo más complejo después del Metadata engine. Inversión time inicial: ~2 días en S0. Después: ~2h/semana mantenimiento. ROI alto a largo plazo.
