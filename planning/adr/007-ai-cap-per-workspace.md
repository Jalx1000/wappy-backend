# ADR 007 — AI Copilot con cap por workspace

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + architect

## Contexto

Wappy ofrece AI Copilot (reply suggestions, conversation summary, tone rewriting, NL → SQL sobre custom objects). LLMs cuestan dinero. Sin control, un workspace patológico (loop infinito, agente abusivo, bot mal escrito) puede generar **cientos de dólares en horas**.

Hay que decidir:
1. Proveedor LLM.
2. Modelo de control de costo.
3. Qué pasa cuando se supera el límite.

## Decisión

### Proveedor: multi-adapter detrás de port `LlmProvider`

Dos adapters implementados desde S17:

- **`LocalLlmAdapter` (primario)**: Ollama/vLLM corriendo en GPU del founder (o futuro VPS GPU). Costo marginal cero por llamada. Modelos default: `llama3.1:8b-instruct` para suggestions, `qwen2.5:14b` para razonamiento más complejo (NL → SQL).
- **`AnthropicAdapter` (fallback)**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Usado solo si local falla o si workspace plan tiene `useCloudLlm=true`. Costo: ~$1/M input + $5/M output tokens.

El config `LLM_PROVIDER` define cuál es primario (default `local`); fallback declarado en código (Anthropic siempre disponible si `ANTHROPIC_API_KEY` está set).

### Control de costo: cap por workspace por mes

- **Cap default**: $5 USD/mes por workspace (configurable per-plan).
  - Pro: $10/mo incluido.
  - Business: $30/mo incluido.
  - Enterprise: negociable, default $100/mo.
- **Tracking**:
  - Counter en Redis: `llm:usage:{workspaceId}:{yyyy-mm}` (HASH con tokens in, tokens out, USD consumido).
  - Pre-call: estima costo (input tokens * costInPerToken + max output * costOutPerToken).
  - Post-call: ajusta con tokens reales.
- **Pricing tabla** (mantenida en código `LLM_PROVIDER_PRICING`):
  - `local`: $0 (servidor propio).
  - `anthropic-haiku-4-5`: $0.000001 input + $0.000005 output (USD per token).
- **Overage**: si cliente quiere usar más que su cap, **add-on metered** $1.50 USD per $1 USD consumido. Se factura manualmente (S17 implementation), automático en S33 (Stripe Billing).

### Comportamiento al llegar al cap

- Endpoint responde **HTTP 402 Payment Required** con body:
  ```json
  {
    "error": "LLM_QUOTA_EXHAUSTED",
    "message": "Your AI Copilot quota of $5.00 for 2026-06 has been used.",
    "usage": { "used": 5.02, "cap": 5.00, "resetAt": "2026-07-01T00:00:00Z" },
    "addOnLink": "https://app.wappy.dev/settings/billing/ai-addon"
  }
  ```
- Evento WebSocket `copilot:quota_exhausted` broadcast al workspace para que UI muestre banner.
- Admin del workspace puede:
  - Aumentar cap (si plan lo permite) en self-service.
  - Comprar add-on overage (Pro = $10/mo extra por +$10 cap).
- **Email automático** al admin del workspace al 80% del cap (warning) y al 100% (block).

### Privacidad

- **Local LLM por defecto**: data nunca sale del servidor de Wappy.
- **Anthropic fallback**: opt-in explícito por workspace (`useCloudLlm=true` en settings). Default off.
- **Audit log** de cada llamada LLM: workspaceId, memberId, feature (suggest/summary/sql), provider, tokens, USD.
- **No training**: con Anthropic, request header `anthropic-version` + opt-out de training según TOS Anthropic.

## Consecuencias

### Positivas

- **Costo predecible**: máximo riesgo per workspace = el cap. Plan Pro = max $10/mo en LLM = aceptable.
- **Diferenciador "AI sin sorpresas"**: ningún competidor tiene cap visible. Intercom Fin cuesta $0.99 por resolution sin tope.
- **GPU del founder = costo marginal cero** en local. Anthropic solo como safety net.
- **Add-on revenue**: si cliente power-user excede cap, revenue extra del overage. Margen alto.
- **Privacy story strong**: "tu data no entrena modelos de OpenAI/Anthropic" es vendible a clientes HIPAA/GDPR-conscious.

### Negativas

- **Local LLM tiene fail modes raros**: GPU se cuelga, model crashea, latencia spikes. Sin Anthropic fallback, Copilot deja de funcionar.
- **Token counting impreciso**: el counter pre-call estima output tokens; el real puede variar. Hay que reconciliar post-call.
- **Multi-instancia race**: dos requests simultáneos podrían pasar el check antes de incrementar. Mitigación: `INCRBYFLOAT` atómico + retry si check falla post-call.
- **Cap mensual no es por sliding window**: cliente puede gastar $5 el día 1 y esperar 30 días. Considerar daily cap = mensual/30 para suavizar.
- **NL → SQL es el feature más caro**: prompt grande con schema. Cap a 5 queries/día per member adicional al cap USD.

### Mitigaciones

- **Circuit breaker Anthropic → local**: si local LLM falla >3 veces en 5 min, route todo a Anthropic temporalmente (con throttling). Auto-recovery cada 30 min.
- **Token counter reconcile cron**: nightly, calibra Redis counter contra audit log de calls reales.
- **Hard rate limit per Member** además del cap workspace: máx 100 llamadas LLM/hora per Member para evitar bots abusivos.
- **NL → SQL specific limits**: máx 5 queries/día per Member, no contado contra cap USD pero contado en `llm:nlsql:{wsId}:{date}`.
- **Daily cap opcional**: workspace puede setear `dailyCap = monthlyCap / 30` en settings.

## Alternativa rechazada: solo Anthropic (sin local)

Más simple. Razones de rechazo:

- Costo recurrente alto (~$30-100/mo per workspace activo) → erosiona margen.
- Privacy story débil.
- Latencia mayor (~500-2000ms vs 100-400ms local).

## Alternativa rechazada: usage-based puro sin cap

Cobrar por consumo real, sin tope. Razones de rechazo:

- Riesgo de "bill shock" para cliente → churn.
- Soporte burden gigante ("¿por qué mi factura es de $400?").
- Requiere Stripe Billing desde día 1 (descartado por [[ADR-005]]).

## Referencias

- Anthropic API pricing.
- Ollama deployment patterns.
- vLLM throughput benchmarks.
- Intercom Fin pricing model (resolution-based).

## Notas

Cap por workspace es UX de billing predecible. Cuando lleguemos a v2 con Stripe Billing, podemos ofrecer also "unlimited AI" tier premium si hay demanda.
