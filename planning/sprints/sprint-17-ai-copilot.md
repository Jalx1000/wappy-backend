# Sprint 17 — AI Copilot (local + Anthropic) + Cap + AI sobre custom objects

**Duración**: 2 semanas
**Objetivo**: AI funcional con cap por workspace estricto. Local LLM primario (Ollama/vLLM en GPU del founder), Anthropic fallback. NL → SQL sobre custom objects = feature killer.
**Definition of Done del sprint**:
- LlmProvider port con 2 adapters (local + Anthropic).
- Token counting + USD conversion + Redis counter.
- Cap default $5/mo/workspace enforced.
- Features: reply suggestions, conversation summary, tone rewriting, NL→SQL.
- 402 cuando se llega al cap + email warnings 80% y 100%.

**Demo**: en composer aparecen 3 reply suggestions; click → inserta. Summary genera. "Show me orders > $500 from VIP contacts last week" → query results. Llegar al cap → 402.

**Referencias**: [[ADR-007]].

---

## Tareas

### [team-lead] WAPPY-17-01 — Kickoff + validate GPU local setup
- **Puntos**: 1
- **Descripción**: Confirmar Ollama running en GPU del founder. Si no, usar Anthropic primario en MVP, switch local en v1.1.

### [team-lead] WAPPY-17-15 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-17-02 — Diseño LlmProvider port + cap engine
- **Puntos**: 5
- **Descripción**:
  - Port `LlmProvider` con métodos `complete(prompt, opts)`, `embed(text)`, `countTokens(text)`.
  - Adapter `LocalLlmAdapter` (HTTP a Ollama).
  - Adapter `AnthropicAdapter` (SDK Anthropic).
  - `CapEnforcerService`: pre-call estima costo, post-call ajusta, blocking en límite.
  - Pricing table en código.
  - Tabla `core.llm_usage_log` para audit.

### [backend] WAPPY-17-03 — Implementar LocalLlmAdapter (Ollama)
- **Puntos**: 5
- **Descripción**: Cliente HTTP a Ollama. Streaming optional. Timeout 30s. Retry 1 vez.

### [backend] WAPPY-17-04 — Implementar AnthropicAdapter (Claude Haiku 4.5)
- **Puntos**: 3
- **Descripción**: SDK `@anthropic-ai/sdk`. Modelo `claude-haiku-4-5-20251001`. Apply prompt caching donde aplique.

### [backend] WAPPY-17-05 — CapEnforcerService + Redis counter
- **Puntos**: 5
- **Descripción**:
  - Counter `llm:usage:{wsId}:{yyyy-mm}` (HASH: tokensIn, tokensOut, usdUsed).
  - Pre-call check: estimated_cost > remaining → 402.
  - Post-call: increment con valores reales.
  - Emit `copilot:quota_exhausted` WS event.

### [backend] WAPPY-17-06 — Circuit breaker local → Anthropic
- **Puntos**: 3
- **Descripción**: Si LocalLlmAdapter falla >3 veces en 5min → ruta a Anthropic temporalmente. Auto-recovery 30min.

### [backend] WAPPY-17-07 — Feature: reply suggestions
- **Puntos**: 5
- **Descripción**: Endpoint `POST /api/v1/copilot/reply-suggestions` body `{ conversationId }`. Prompt incluye últimos N mensajes + tono workspace. Devuelve 3 sugerencias.

### [backend] WAPPY-17-08 — Feature: conversation summary
- **Puntos**: 3
- **Descripción**: `POST /api/v1/copilot/summarize` body `{ conversationId }`. Devuelve summary 3-5 frases.

### [backend] WAPPY-17-09 — Feature: tone rewriting
- **Puntos**: 3
- **Descripción**: `POST /api/v1/copilot/rewrite` body `{ text, tone formal|casual|empathetic|concise }`. Devuelve texto reescrito.

### [backend] WAPPY-17-10 — Feature: NL → SQL sobre custom objects
- **Puntos**: 8
- **Descripción**:
  - `POST /api/v1/copilot/ask` body `{ question }`.
  - Prompt: schema de metadata del workspace + question.
  - LLM genera SQL.
  - **Validación crítica**: SQL solo SELECT, prefijo del schema correcto, sin DROP/UPDATE/DELETE.
  - Ejecuta query con timeout 10s, limit 1000 rows.
  - Devuelve resultados + SQL generado (para transparencia).
  - Extra rate limit: 5 queries/día por Member.

### [backend] WAPPY-17-11 — Email warnings 80% + 100% cap
- **Puntos**: 3
- **Descripción**: Cron horario chequea workspaces near cap. Email admin si pasó 80% (warning) o 100% (blocked).

### [qa] WAPPY-17-12 — Tests AI features
- **Puntos**: 5
- **Descripción**: Mock LlmProvider. Tests:
  - Reply suggestions devuelven 3 strings.
  - Cap enforcement: setear usage cerca del cap, llamada falla con 402.
  - Circuit breaker: simular falla local → routes Anthropic.
  - NL→SQL: validation rechaza DROP attempt.

### [cybersecurity] WAPPY-17-13 — Audit NL → SQL (SQL injection vector)
- **Puntos**: 5
- **Descripción**: NL→SQL es el feature más peligroso. Audit:
  - Sandbox SQL execution: read-only role Postgres dedicado.
  - Allowlist statements (solo SELECT).
  - Schema enforcement (no cross-tenant).
  - Resource limits (timeout, rows).
  - Audit log de cada query con SQL.

### [devops] WAPPY-17-14 — Setup Ollama production (GPU server)
- **Puntos**: 5
- **Descripción**:
  - Si GPU del founder: configurar como servicio remoto accesible via WireGuard desde Railway.
  - Si no: provisionar VPS GPU (RunPod, Lambda Labs) con Ollama systemd.
  - Modelos: `llama3.1:8b-instruct` para suggestions, `qwen2.5:14b` para NL→SQL.
  - Monitoring + restart on crash.

---

## Métricas | Total story points | 60 |

## Notas

- AI Copilot es **gran feature comercial**. Privacy story (local LLM) vende a clientes regulados.
- NL→SQL es el feature más arriesgado de todos. CyberSec dedica un sprint completo si hace falta.
- Anthropic prompt caching baja costos 50-90% en prompts repetitivos. Aplicar a prompts con schema.
