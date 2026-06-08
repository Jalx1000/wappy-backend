# Sprint 12 — Automations + Rules Engine

**Duración**: 2 semanas
**Objetivo**: Reglas when/then evaluadas en eventos del sistema. Sin UI visual (eso es Workflow Builder en S13); aquí es engine + endpoints.
**Definition of Done del sprint**:
- AutomationRule CRUD.
- Event bus interno que evalúa reglas en eventos relevantes.
- Triggers + Actions catalogados.
- Workers BullMQ para actions lentas.
- Dedup + rate limit per rule.

**Demo**: regla "cuando conv tagged 'vip' → asignar a senior + notificar Slack"; etiquetar conv → ver acciones ejecutadas en logs.

---

## Tareas

### [team-lead] WAPPY-12-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-12-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-12-02 — Diseño Rule Engine
- **Puntos**: 5
- **Descripción**:
  - `AutomationRule` (workspaceId, name, trigger jsonb, conditions jsonb, actions jsonb, isActive, dedupKey, rateLimitPerMin).
  - Event bus interno (NestJS EventEmitter2 + Redis pubsub para multi-instancia).
  - Trigger types: `conversation.created`, `conversation.assigned`, `conversation.tagged`, `conversation.status_changed`, `message.received`, `message.sent`, `contact.created`, `contact.attribute_changed`, `customobject.created`, `customobject.updated`, `customobject.deleted`, `sla.warning`, `sla.breach`.
  - Action types: `tag`, `assign`, `notify_member`, `send_webhook`, `set_attribute`, `add_to_campaign`, `trigger_workflow`, `send_message`.
  - Condition evaluator (mismo que bot engine: contact.X eq Y, tags includes Z, time_in_status > N).

### [backend] WAPPY-12-03 — Generar AutomationRule
- **Puntos**: 2

### [backend] WAPPY-12-04 — Event bus interno
- **Puntos**: 5
- **Descripción**: Wrapper sobre EventEmitter2 + Redis. Events tipados. Cross-instance broadcast.

### [backend] WAPPY-12-05 — RuleEngineService
- **Puntos**: 8
- **Descripción**: Suscribe a todos los triggers. Por evento, encuentra reglas matching (cache LRU per workspace). Evalúa conditions. Ejecuta actions (síncronas) o enqueue (asíncronas).

### [backend] WAPPY-12-06 — Action handlers
- **Puntos**: 5
- **Descripción**: Cada action type tiene handler. tag/assign/set_attribute son síncronos. notify_member dispara Notification (S19 lo construirá; placeholder ahora). send_webhook → enqueue BullMQ. send_message envía via canal correspondiente.

### [backend] WAPPY-12-07 — Dedup + rate limit per rule
- **Puntos**: 3
- **Descripción**: `dedupKey` opcional: si la misma rule + mismo target dispara 2 veces en X tiempo → skip 2da. Rate limit Redis counter per rule.

### [backend] WAPPY-12-08 — CRUD endpoints
- **Puntos**: 2

### [backend] WAPPY-12-09 — Run history per rule (audit)
- **Puntos**: 3
- **Descripción**: `AutomationRunLog` (ruleId, triggerEvent, conditionsResult, actionsExecuted, success, errors, executedAt). Endpoint `GET /api/v1/automations/:id/runs` para debugging.

### [qa] WAPPY-12-10 — Tests engine
- **Puntos**: 5
- **Descripción**: Cada trigger × cada action × happy path + condition false + error en action.

### [qa] WAPPY-12-11 — Tests rate limit + dedup
- **Puntos**: 3
- **Descripción**: 100 events rápidos con dedup → solo 1 execution. Rate limit per rule enforced.

---

## Métricas | Total story points | 43 |

## Notas

- Automations son base del producto "smart inbox". Sin ellas, el inbox es solo storage.
- Workflow Builder (S13) es la versión visual + multi-step. Automations son single-step síncronas.
- `notify_member` action depende de Notifications (S19); placeholder por ahora.
