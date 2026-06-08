# Roles

Cada tarea de cada sprint se asigna a uno de estos 8 roles. En la realidad de Wappy (1 founder + Claude subagents), el founder ejecuta físicamente todo, pero **el rol determina la mentalidad y el contexto** con el que se aborda cada tarea — y permite delegar a un subagent específico con prompt adecuado.

---

## team-lead

**Mentalidad**: gerente de sprint. Vela por el "qué" y el "cuándo", no por el "cómo".

**Responsabilidades**:
- Planning y grooming del sprint antes del kickoff.
- Daily check-in (aunque sea contigo mismo) — revisar bloqueos y reprioritizar.
- Coordinar dependencias entre tareas (ej: backend no puede arrancar X hasta que devops haya hecho Y).
- Revisar PRs cruzados — garantizar que tareas de otros roles encajen.
- Retrospectiva al final del sprint — qué funcionó, qué no, qué mover al backlog.
- Mantener `planning/` actualizado: marcar tareas done, mover scope no terminado al siguiente sprint, actualizar el backlog.

**Cuándo aparece en cada sprint**: siempre. Al menos 2-3 tareas por sprint (kickoff, mid-sprint review, demo + retro).

---

## architect

**Mentalidad**: dueño del diseño. Su trabajo se mide en decisiones documentadas, no en líneas de código.

**Responsabilidades**:
- Diseñar antes de codificar para decisiones no triviales (esquema, contratos, patterns).
- Escribir ADRs (`planning/adr/NNN-titulo.md`) para cada decisión que el equipo no pueda revertir trivialmente.
- Revisar el diff arquitectónico de los PRs (¿el cambio respeta Hexagonal? ¿el adapter no se está filtrando al service? ¿el contrato API es estable?).
- Vetar shortcuts que comprometan la base (ej: leer entidad TypeORM desde un service, hacer query sin pasar por el port).
- Mantener actualizado el diagrama de dependencias entre módulos.

**Cuándo aparece**: sprints arquitectónicos (S0, S1, S3, S4, S5, S6, S22, S24, S25) con peso alto. En sprints "ejecución pura" (mucha lógica de negocio) aparece solo para revisión de diseño.

---

## backend

**Mentalidad**: ingeniero NestJS. Genera módulos con Hygen, escribe services, controllers, resolvers, mappers, repos, workers BullMQ.

**Responsabilidades**:
- Usar **siempre** los generadores Hygen para entidades sistema. Nunca hand-roll un módulo nuevo.
- Implementar lógica de negocio en `service.ts`. Mantener controllers/resolvers/gateways finos (solo I/O).
- Implementar adapters de repositorios respetando schema-per-tenant.
- Workers BullMQ para procesos asíncronos.
- Tests unitarios de cada service + repo.
- Mantener el contrato API estable (versionar `/api/v1` desde el día 1).

**Cuándo aparece**: en todos los sprints. Es el rol con más volumen de tareas.

---

## devops

**Mentalidad**: infra como código. Idempotencia, observabilidad, escalabilidad.

**Responsabilidades**:
- docker-compose, Dockerfiles, scripts de startup.
- Railway: provisioning, env vars, scaling, monitoring.
- Cloudflare: DNS, wildcard, proxy, R2, custom hostnames (Enterprise).
- Observabilidad: pino → Loki, métricas → Prometheus, errores → Glitchtip, traces → Tempo, dashboards → Grafana.
- CI/CD en GitHub Actions: lint, test, build, deploy.
- Secrets management (no en repo, en Railway dashboard).
- Backups y disaster recovery: snapshots de Postgres, plan de restore.
- Migraciones runtime per-tenant (custom objects DDL).

**Cuándo aparece**: pico en S0, S21, S24. Tareas constantes (1-3 por sprint) en el resto.

---

## qa

**Mentalidad**: paranoia profesional. Si no hay test, no existe.

**Responsabilidades**:
- Tests unit donde no los hagan los backenders (cobertura mínima 70%).
- **Tests e2e de aislamiento entre tenants** en cada sprint que toque persistencia.
- Tests e2e del flujo HTTP/WS de cada feature nueva.
- Load tests de endpoints críticos (al menos en S9, S14, S17, S21).
- Regression suite que corre en CI.
- Mantener fixtures y seeds para escenarios de prueba.
- Reportar bugs encontrados como issues priorizados.

**Cuándo aparece**: en todos los sprints. Más peso en sprints de comunicación tiempo-real (S9, S15) y launch (S21).

---

## cybersecurity

**Mentalidad**: asumir que el adversario tiene tu mismo código. Defensa en profundidad.

**Responsabilidades**:
- Threat modeling al inicio de cada módulo crítico (auth, channels, integrations, file uploads, custom objects).
- Revisión de seguridad de cada PR que toque: JWT, RBAC, validación de DTOs, queries SQL dinámicas (¡custom objects!), uploads, webhooks.
- Implementar HMAC en webhooks salientes; verificar firma en webhooks entrantes.
- Secret scanning en CI (`gitleaks` o similar).
- Rotación de secrets documentada.
- OWASP Top-10 review en S21 (pre-launch) y S26 (pre-GA Enterprise).
- Pentest interno del widget público (atacable desde cualquier site).
- Definir y enforcer field-level encryption en S25.
- Compliance check para GDPR (right to erasure, export) — informalmente en v1, formal en v2.

**Cuándo aparece**: sprints de auth (S2), tenancy (S1), channels (S8), file uploads (S9), custom objects DDL (S3, S4), integrations (S18), launch (S21), enterprise (S22-S26).

---

## data-analyst

**Mentalidad**: el producto se mide. KPIs antes de features.

**Responsabilidades**:
- Definir esquema de eventos analíticos (qué se trackea, con qué payload).
- Modelar las tablas de `MetricSnapshot` y los jobs de materialización.
- Diseñar las métricas predefinidas (TMR, FRT, CSAT, volumen, performance por agente, conversion por canal).
- Construir dashboards Grafana de negocio (no técnicos): usuarios activos, conversaciones por día, mensajes por canal, costos LLM por workspace.
- Diseñar el motor de Custom Dashboards (S16) — qué widgets, qué charts, qué filtros se soportan.
- Definir la estructura de Reports + Scheduled Reports.
- Revisar la calidad de los datos analíticos (no nulls donde no debería, agregaciones correctas).

**Cuándo aparece**: planning de eventos (S7), Analytics (S16), AI sobre custom objects (S17), pre-launch metrics (S21).

---

## meta-developer

**Mentalidad**: especialista en el ecosistema Meta. Domina Cloud API, app review, plantillas, BSP.

**Responsabilidades**:
- Verificación de Meta Business Account (gestión del proceso burocrático).
- Setup de Meta App con permisos correctos (WhatsApp Business Management, Pages, Instagram Basic Display).
- App Review submission cuando el cliente conecta Messenger/Instagram en producción.
- Implementar el ingest de webhooks Meta (firma + dedupe + routing por `phone_number_id`/`page_id`).
- Implementar outbound a WhatsApp Cloud API (mensajes service-tier gratis + marketing/utility pagados por el cliente).
- Gestión de plantillas WhatsApp (submission a Meta + estado pending/approved/rejected).
- Soporte 24h-window de WhatsApp (mensajes free vs paid según ventana).
- Best practices anti-spam para no quemar números.

**Cuándo aparece**: S8 (foundation Meta), S14 (campaigns WhatsApp), S20 (templates verticales que requieren WhatsApp), sprints donde haya cambios en API Meta.

---

## Cómo se asignan tareas en cada sprint

En cada `sprints/sprint-NN-*.md` las tareas están agrupadas por rol. Una tarea pertenece al rol cuya mentalidad domina su ejecución, aunque puede requerir input de otros roles (anotado en `Dependencias`).

Ejemplo: "Implementar `TenantSchemaResolver`" es **[architect]** porque la decisión de diseño domina, aunque el backend escriba el código y devops configure los schemas. El team-lead coordina la entrega.

---

## Carga de trabajo esperada por rol (promedio)

| Rol | Peso típico por sprint |
|---|---|
| backend | 40-55% |
| devops | 10-20% |
| qa | 10-20% |
| architect | 5-15% (más en sprints de fundamentos) |
| cybersecurity | 5-10% |
| team-lead | 5-10% |
| data-analyst | 0-15% (cero en muchos, mucho en sprints de analytics) |
| meta-developer | 0-30% (cero en muchos, mucho en sprints de canales Meta) |
