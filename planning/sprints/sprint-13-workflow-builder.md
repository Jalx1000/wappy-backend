# Sprint 13 — Workflow Builder visual (n8n-style)

**Duración**: 2 semanas
**Objetivo**: Workflows multi-step con branching, loops, delays. Engine persistente para que sobrevivan reinicio.
**Definition of Done del sprint**:
- Workflow CRUD con nodes + edges (graph).
- Node types: trigger, condition, loop, parallel, action, delay, http_request, custom_function.
- WorkflowRun persistente.
- Retry policy.
- Run history para debugging.
- Manual/webhook/schedule triggers.

**Demo**: workflow "Nuevo Order → email confirmación → delay 24h → si no pagado, reminder → si 7d, expire"; trigger Order created → ver ejecución progresiva en runs history.

**Riesgos**: scope grande. custom_function requiere V8 isolate (mismo del S4). Mitigación: si S4 difirió custom_js, también diferir aquí; cubrir todo lo demás.

---

## Tareas

### [team-lead] WAPPY-13-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-13-13 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-13-02 — Diseño Workflow + Engine persistente
- **Puntos**: 5
- **Descripción**:
  - `Workflow` (name, nodes jsonb con positions [{id, type, params, x, y}], edges jsonb [{from, to, condition?}], isActive, version).
  - `WorkflowRun` (workflowId, triggerPayload jsonb, state jsonb {currentNodeId, variables, history}, status running|completed|failed|paused, startedAt, finishedAt, errorMessage).
  - State machine que persiste cada paso (sobrevive restart de worker).
  - Delay nodes usan BullMQ delayed jobs.

### [backend] WAPPY-13-03 — Generar Workflow + WorkflowRun
- **Puntos**: 2

### [backend] WAPPY-13-04 — WorkflowEngineService (state machine)
- **Puntos**: 8
- **Descripción**: Engine que ejecuta nodos secuencialmente. Soporta:
  - Sequencial advance.
  - Conditional branch.
  - Loop con max iterations.
  - Parallel (espera todos los branches).
  - Delay (BullMQ delayed re-trigger).
  - State persistido entre nodos.

### [backend] WAPPY-13-05 — Node handlers
- **Puntos**: 8
- **Descripción**:
  - `trigger` (entry point).
  - `action` (reutiliza handlers de Automations).
  - `condition` (mismo evaluator).
  - `delay` (BullMQ delayed job para resume).
  - `http_request` (fetch outbound con retry).
  - `loop` (iter sobre array, max N).
  - `parallel` (fanout + fanin).
  - `custom_function` (V8 isolate; condicionado a S4).

### [backend] WAPPY-13-06 — Triggers: manual, webhook, schedule
- **Puntos**: 3
- **Descripción**: Manual: endpoint `POST /api/v1/workflows/:id/run`. Webhook: cada workflow puede tener URL única `https://api.wappy.dev/wf/{slug}/{token}` (autenticado por token). Schedule: cron expression → BullMQ cron job.

### [backend] WAPPY-13-07 — Retry policy
- **Puntos**: 3
- **Descripción**: Por workflow + per node. Exponential backoff (1s, 5s, 30s, 5min). Max retries configurable.

### [backend] WAPPY-13-08 — Run history endpoints
- **Puntos**: 3
- **Descripción**: `GET /api/v1/workflows/:id/runs?status=...`. `GET /api/v1/workflows/runs/:runId` con full trace (cada nodo, duración, output).

### [backend] WAPPY-13-09 — CRUD endpoints
- **Puntos**: 2

### [qa] WAPPY-13-10 — Tests engine
- **Puntos**: 8
- **Descripción**: Workflows simples + delay + condition + loop + parallel + error en nodo + retry. Persistencia: kill worker mid-run → restart → resume.

### [qa] WAPPY-13-11 — Tests adversarios
- **Puntos**: 3
- **Descripción**: Infinite loop detect (max 1000 iters). HTTP request a localhost (SSRF guard). Custom function escape attempts.

### [cybersecurity] WAPPY-13-12 — Audit http_request + custom_function
- **Puntos**: 3
- **Descripción**: SSRF: blocklist (no `localhost`, `127.0.0.1`, `169.254.*`, ranges privados). Timeout 30s. Custom function sandbox audit (si implementado).

---

## Métricas | Total story points | 50 |

## Notas

- Workflows son más caros computacionalmente que Automations (estado persistente, jobs delayed). Reservar Pro=10 workflows max, Business=50, Enterprise=ilimitado.
- Frontend visual editor es responsabilidad del frontend repo.
- En MVP no incluye templates de workflow pre-armados (eso en S20 templates verticales).
