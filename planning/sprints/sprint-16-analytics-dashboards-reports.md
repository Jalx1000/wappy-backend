# Sprint 16 — Analytics + Custom Dashboards + Reports

**Duración**: 2 semanas
**Objetivo**: Métricas predefinidas (TMR, FRT, CSAT, volumen) + cliente arma sus propios dashboards sobre custom objects + reports programados por email.
**Definition of Done del sprint**:
- MetricSnapshot materialización por cron horario.
- 6+ métricas predefinidas calculadas correctamente.
- Dashboard Builder con widgets (number, bar, line, pie, funnel, table).
- Report scheduler envía PDF/CSV.
- CSAT survey post-resolución funcional.

**Demo**: dashboard predefinido "Inbox Health" muestra métricas. Crear dashboard custom con widget "Revenue per week" sobre Orders. Programar reporte semanal a admin.

---

## Tareas

### [team-lead] WAPPY-16-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-16-15 — Demo + retro
- **Puntos**: 1

### [data-analyst] WAPPY-16-02 — Diseño catalog de métricas + estructura snapshots
- **Puntos**: 5
- **Descripción**:
  - Métricas predefinidas:
    - `TMR` (Tiempo Medio de Respuesta): avg(firstResponseAt - createdAt) per period per agent.
    - `FRT` (First Response Time): mismo pero distribución p50/p95.
    - `Resolution Rate`: % conversations resolved per period.
    - `Conversation Volume`: count(conv created) per period per channel.
    - `Message Volume`: count(message sent) per period per author type.
    - `CSAT Score`: avg(survey response score).
    - `Agent Performance`: conv resolved per agent per period.
    - `Channel Distribution`: % per channel.
  - `MetricSnapshot` (workspaceId, key, period hour|day|week|month, periodStart, value, dimensions jsonb).
  - Jobs cron hourly que materializan.

### [data-analyst] WAPPY-16-03 — Diseño Custom Dashboards
- **Puntos**: 3
- **Descripción**:
  - `Dashboard` (workspaceId, name, layout jsonb, isShared, ownerMemberId).
  - `Widget` (dashboardId, type number|bar|line|pie|funnel|table, query jsonb, config jsonb, position).
  - Query: filter + group + aggregate over object.

### [backend] WAPPY-16-04 — Generar MetricSnapshot + jobs
- **Puntos**: 3

### [backend] WAPPY-16-05 — Implementar materialización de métricas predefinidas
- **Puntos**: 8
- **Descripción**: 8 jobs (uno por métrica) cron hourly. Cada job calcula para todas los workspaces el último periodo. Idempotente.

### [backend] WAPPY-16-06 — Endpoints predefined metrics
- **Puntos**: 3
- **Descripción**: `GET /api/v1/analytics/metrics/:key?from=...&to=...&dim=...` devuelve series de tiempo.

### [backend] WAPPY-16-07 — Generar Dashboard + Widget
- **Puntos**: 3

### [backend] WAPPY-16-08 — Custom Dashboard engine
- **Puntos**: 8
- **Descripción**: `WidgetService.execute(widget, params)`:
  - Aplica filter sobre object via QueryEngine.
  - Aggregation (count, sum, avg, min, max).
  - Group by date / dimension.
  - Devuelve formato listo para chart.
- Cache LRU 5min.

### [backend] WAPPY-16-09 — CSAT survey
- **Puntos**: 3
- **Descripción**: `Survey` (workspaceId, conversationId, contactId, score 1-5, comment, askedAt, answeredAt). Endpoint público `GET csat.wappy.dev/:token` envía via email post-resolution.

### [backend] WAPPY-16-10 — Reports + scheduled email
- **Puntos**: 5
- **Descripción**:
  - `Report` (workspaceId, name, dashboardId, recipients [emails], schedule cron expr, format pdf|csv|xlsx).
  - Worker cron BullMQ.
  - Render PDF via puppeteer (headless Chrome) — dedicated worker.
  - CSV/XLSX server-side.

### [qa] WAPPY-16-11 — Tests métricas (correctness)
- **Puntos**: 5
- **Descripción**: Seed scenarios con números conocidos → verificar cálculos exactos de cada métrica.

### [qa] WAPPY-16-12 — Tests Dashboards + Reports
- **Puntos**: 5
- **Descripción**: Create dashboard, add widgets, query, render. Schedule report, verify email arrives.

### [devops] WAPPY-16-13 — Worker dedicado puppeteer (PDF render)
- **Puntos**: 3
- **Descripción**: Service Railway con headless Chrome. Memoria isolada para no leak.

### [devops] WAPPY-16-14 — Dashboards Grafana de business metrics
- **Puntos**: 2
- **Descripción**: Para founder: workspaces activos, MRR (cuando aplique), churn signal, AI usage cost, queue depths.

---

## Métricas | Total story points | 58 |

## Notas

- 8 métricas predefinidas en MVP. Más en v1.1.
- Custom Dashboards es feature que vende Business/Enterprise. ROI alto.
- Reports scheduled = first BullMQ cron production-grade. Reusable para v1.1.
