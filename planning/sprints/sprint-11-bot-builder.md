# Sprint 11 — Bot Builder + Engine

**Duración**: 2 semanas
**Objetivo**: Bots conversacionales con flujos JSON. State machine engine que ejecuta nodos. Tipos fijos: message, question, condition, assign, article, end.
**Definition of Done del sprint**:
- BotFlow CRUD + versionado.
- Engine ejecuta flujos en respuesta a triggers (conversation:created, keyword, manual).
- BotRun tracking persistente.
- Test mode (ejecuta sin afectar conv real).
- Conditions leen Contact attributes + custom objects.

**Demo**: bot "FAQ pricing": mensaje contiene "precio" → envía artículo → "¿te sirvió?" → si no → asigna a humano. Triggered → engine runs → message visible en inbox.

---

## Tareas

### [team-lead] WAPPY-11-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-11-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-11-02 — Diseño BotFlow + Engine
- **Puntos**: 5
- **Descripción**:
  - `BotFlow` (name, trigger jsonb, nodes jsonb, edges jsonb opcional, version, isActive, isPublished).
  - Node schema: `{ id, type, content?, options?, condition?, nextNodeId?, trueNodeId?, falseNodeId? }`.
  - `BotRun` (botFlowId, conversationId, currentNodeId, state jsonb, startedAt, endedAt).
  - Engine: state machine que avanza por trigger → procesa nodo → o espera (question) o avanza (message, condition).
  - Resume desde `currentNodeId` cuando llega respuesta del contact.
  - Versionado: nueva publicación crea version+1, runs activos siguen con su version.

### [backend] WAPPY-11-03 — Generar BotFlow + BotRun
- **Puntos**: 3

### [backend] WAPPY-11-04 — BotEngineService (execute flow)
- **Puntos**: 8
- **Descripción**:
  - Execute desde nodo `start` → procesa loop hasta `question` (espera input) o `end`.
  - Cada nodo tiene handler específico: messageHandler envía Message, questionHandler envía Message + espera, conditionHandler evalúa + branchea, assignHandler asigna, articleHandler envía link, endHandler cierra BotRun.
  - Conditions: parser para `contact.attributes.X eq 'foo'`, `contact.tags includes 'vip'`, etc.

### [backend] WAPPY-11-05 — Triggers: conversation:created, keyword, manual
- **Puntos**: 5
- **Descripción**: Event listeners. Keyword: regex match en mensaje. Manual: endpoint para arrancar bot desde UI.

### [backend] WAPPY-11-06 — Resume bot al recibir mensaje del contact
- **Puntos**: 3
- **Descripción**: Cuando llega `message:new` con authorType=contact a una conv con BotRun activo, engine resume desde currentNodeId.

### [backend] WAPPY-11-07 — Test mode
- **Puntos**: 3
- **Descripción**: `POST /api/v1/bot-flows/:id/test` con sample contact data → ejecuta sin crear conv real ni enviar mensajes; devuelve trace de ejecución.

### [backend] WAPPY-11-08 — Versionado de BotFlow
- **Puntos**: 3
- **Descripción**: Publish crea version inmutable. Runs activos quedan en su version. CRUD endpoints + list versions.

### [backend] WAPPY-11-09 — CRUD endpoints BotFlow
- **Puntos**: 2

### [qa] WAPPY-11-10 — Tests engine
- **Puntos**: 5
- **Descripción**: Flujos simples (message → end), con question, con condition true/false, assign, article. Resume después de question.

### [qa] WAPPY-11-11 — Tests adversarios bot
- **Puntos**: 3
- **Descripción**: Loops infinitos (nodo apunta a sí mismo) → detect + abort. Conditions inválidas → safe error. Múltiples bots activos en misma conv → handling.

---

## Métricas | Total story points | 42 |

## Notas

- Bot Engine consume eventos de Conversations (S9) + opcionalmente Articles (S10). Asegurar disponibilidad de esos módulos.
- En MVP: nodos fijos. Custom JS nodes son v2 (S31).
- Frontend builder visual del bot es responsabilidad del frontend repo. Backend solo provee API + engine.
