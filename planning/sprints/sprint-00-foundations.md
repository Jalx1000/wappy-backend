# Sprint 00 — Foundations & Infrastructure

**Duración**: 2 semanas (10 días hábiles)
**Objetivo**: Dejar todo el scaffolding técnico listo antes de escribir lógica de negocio. Cero features de producto; todo es plomería.
**Definition of Done del sprint**:
- `docker compose up` levanta API + Postgres + Redis + observability completa sin errores.
- `/health` y `/ready` verdes en local.
- Logs de la API aparecen en Grafana → Loki vía Promtail.
- Métricas básicas en Prometheus, dashboard mínimo en Grafana.
- Glitchtip recibe un error de prueba.
- Uptime Kuma monitorea local.
- CI corre lint + test + build en cada push.
- i18n bundles ES + EN + PT-BR cargados (con keys placeholder).
- husky pre-commit fix aplicado (npm path issue).

**Demo al final**: `docker compose up`, abrir Grafana, mostrar logs estructurados de un request a `/api`, mostrar métrica de request count, romper algo para que aparezca en Glitchtip.

**Riesgos / dependencias externas**: ninguno. Sprint puro de plomería interna.

**Referencias**: [[ADR-008]] (observabilidad).

---

## Tareas

### [team-lead] WAPPY-00-01 — Kickoff + setup planning operativo
- **Puntos**: 1
- **Depende de**: —
- **Descripción**: Revisar planning completo con founder. Crear board de tareas (Linear/GitHub Projects/spreadsheet — lo que use el founder). Importar las tareas del sprint con IDs `WAPPY-00-XX`. Definir cadencia de daily check-in (15 min self-update).
- **Criterios de aceptación**:
  - [ ] Board del sprint creado con 14 tareas y sus dependencias.
  - [ ] Founder confirma cadencia diaria.
  - [ ] Calendario tiene bloqueado el slot demo + retro al final del sprint.

### [team-lead] WAPPY-00-14 — Demo + retro
- **Puntos**: 1
- **Depende de**: todas
- **Descripción**: Al final del sprint: grabar demo en Loom (5-10 min) mostrando el DoD. Retro: qué funcionó, qué no, qué mover al siguiente sprint.
- **Criterios de aceptación**:
  - [ ] Video demo grabado y archivado en `planning/demos/sprint-00.mp4` (o link).
  - [ ] Retro notes en `planning/retros/sprint-00.md` con 3 columnas (mantener / mejorar / acción concreta).

### [architect] WAPPY-00-02 — Definir layout de carpetas del repo
- **Puntos**: 2
- **Depende de**: WAPPY-00-01
- **Descripción**: El repo actualmente sigue layout boilerplate (`src/<feature>/`). Documentar en `CLAUDE.md` cómo van a convivir: módulos sistema (generados con Hygen) + módulos transversales (`tenancy/`, `metadata/`, `auto-api/`, `module-registry/`) + workers BullMQ (`src/workers/`) + scripts CLI (`scripts/`). Definir naming convention.
- **Criterios de aceptación**:
  - [ ] `CLAUDE.md` actualizado con sección "Project layout" detallada.
  - [ ] Carpetas placeholder creadas: `src/tenancy/`, `src/metadata/`, `src/auto-api/`, `src/module-registry/`, `src/workers/`, `scripts/`.

### [devops] WAPPY-00-03 — Fix husky pre-commit (npm not found)
- **Puntos**: 1
- **Depende de**: —
- **Descripción**: El hook `.husky/pre-commit` falla al ejecutarse desde IDE (Trae/VSCode) por no cargar nvm. Añadir bootstrap de nvm en el hook.
- **Criterios de aceptación**:
  - [ ] `.husky/pre-commit` carga nvm antes de `npm`.
  - [ ] Commit desde IDE funciona sin error.
  - [ ] Commit desde terminal sigue funcionando.

### [devops] WAPPY-00-04 — Extender docker-compose.yaml ⟦parallel⟧
- **Puntos**: 2
- **Depende de**: —
- **Descripción**: Añadir al compose existente: servicio `ollama` opcional (perfil `ai`), variables nuevas del env, volúmenes persistentes para Postgres + Redis + Ollama. Mantener backward compat con scripts existentes.
- **Criterios de aceptación**:
  - [ ] `docker-compose.yaml` actualizado.
  - [ ] `docker compose up` levanta Postgres + Redis + Maildev + API.
  - [ ] `docker compose --profile ai up` añade Ollama.
  - [ ] Volúmenes nombrados sobreviven a `down`/`up`.

### [devops] WAPPY-00-05 — Crear docker-compose.observability.yaml ⟦parallel⟧
- **Puntos**: 5
- **Depende de**: —
- **Descripción**: Compose separado con Grafana, Loki, Promtail/Alloy, Prometheus, Tempo, Glitchtip (+ su Postgres), Uptime Kuma. Network shared con la API para scrape. Documentar puertos en README del compose.
- **Criterios de aceptación**:
  - [ ] `docker compose -f docker-compose.observability.yaml up -d` levanta todos los servicios.
  - [ ] Grafana en `:3001` con datasources Loki, Prometheus, Tempo configurados automáticamente.
  - [ ] Promtail/Alloy lee logs del container `api` y los manda a Loki.
  - [ ] Glitchtip accesible en `:9000` con admin inicial.
  - [ ] Uptime Kuma accesible en `:3002`.
  - [ ] README.md en `docker-compose.observability.yaml` con puertos + credenciales default.

### [backend] WAPPY-00-06 — Instalar y configurar nestjs-pino + helmet + throttler ⟦parallel⟧
- **Puntos**: 3
- **Depende de**: —
- **Descripción**: Añadir deps: `nestjs-pino`, `pino-pretty` (dev), `helmet`, `@nestjs/throttler`. Configurar:
  - Pino: structured logs JSON, redact passwords/tokens/apiKey/accessToken, req_id auto, pretty en dev.
  - Helmet: defaults razonables.
  - Throttler: storage Redis (placeholder hasta tener Redis cliente), defaults `RATE_LIMIT_TTL=60`, `RATE_LIMIT_MAX=120`.
- **Criterios de aceptación**:
  - [ ] `LoggerModule.forRoot()` configurado en `app.module.ts`.
  - [ ] Default logger Nest reemplazado por pino.
  - [ ] Helmet middleware aplicado.
  - [ ] ThrottlerGuard aplicado globalmente.
  - [ ] Test e2e simple: 100 requests rápidos a `/api` devuelven 429 después del cap.

### [backend] WAPPY-00-07 — Instalar @nestjs/bullmq + ioredis + queue base ⟦parallel⟧
- **Puntos**: 3
- **Depende de**: WAPPY-00-04
- **Descripción**: Añadir `@nestjs/bullmq`, `bullmq`, `ioredis`. Crear `src/workers/workers.module.ts` con `BullModule.forRoot()` apuntando a Redis. Crear queue de prueba `health-ping` con processor que loguea cada 30s.
- **Criterios de aceptación**:
  - [ ] `WorkersModule` registrado.
  - [ ] Queue `health-ping` definida.
  - [ ] Worker processor loguea cada 30s ("worker alive").
  - [ ] Logs aparecen en Loki vía Grafana.
  - [ ] Bull Board montado en `/admin/queues` (con auth básica desde env).

### [backend] WAPPY-00-08 — Endpoints /health y /ready
- **Puntos**: 2
- **Depende de**: WAPPY-00-07
- **Descripción**: Crear `src/health/health.module.ts` con dos endpoints públicos:
  - `GET /health` (liveness): 200 si el proceso responde.
  - `GET /ready` (readiness): 200 solo si DB ping OK + Redis ping OK + (opcional) BullMQ queue accesible. 503 si algo falla.
- **Criterios de aceptación**:
  - [ ] Ambos endpoints implementados.
  - [ ] `/ready` falla si Redis está down (probarlo: detener redis con `docker compose stop redis`).
  - [ ] Sin auth requerida (deben ser públicos para load balancers).
  - [ ] Tests e2e verifican ambos escenarios.

### [backend] WAPPY-00-09 — Setup nestjs-i18n con bundles ES + EN + PT-BR ⟦parallel⟧
- **Puntos**: 3
- **Depende de**: —
- **Descripción**: Crear bundles `src/i18n/es/`, `src/i18n/en/`, `src/i18n/pt-br/` con archivos placeholder (`common.json`, `errors.json`, `emails.json`). Header resolver `x-custom-lang` (ya configurado). Fallback ES. Documentar convención de keys (`module.feature.key`).
- **Criterios de aceptación**:
  - [ ] 3 carpetas con bundles base.
  - [ ] `errors.common.notFound` traducido en los 3 idiomas.
  - [ ] Endpoint `GET /api/v1/_test/translate` que devuelve la key resuelta según header.
  - [ ] Documentación de convención en `src/i18n/README.md`.

### [backend] WAPPY-00-10 — Exponer /metrics para Prometheus
- **Puntos**: 2
- **Depende de**: WAPPY-00-06
- **Descripción**: Añadir `@willsoto/nestjs-prometheus`. Exponer `/metrics` (sin auth en local; en prod restringido por network policy). Implementar 1 métrica custom: `wappy_http_request_duration_seconds` (histogram).
- **Criterios de aceptación**:
  - [ ] `/metrics` devuelve formato Prometheus.
  - [ ] Prometheus scrappea correctamente (verificar en `:9090/targets`).
  - [ ] Histogram visible en Grafana.

### [devops] WAPPY-00-11 — GitHub Actions CI básico
- **Puntos**: 3
- **Depende de**: WAPPY-00-03
- **Descripción**: Workflow `.github/workflows/ci.yml` que en cada PR ejecuta: install, lint, build, test (unit), test:e2e:relational:docker (opcional según costo). Cache de node_modules.
- **Criterios de aceptación**:
  - [ ] Push a branch dispara CI.
  - [ ] Lint + build + test corren en < 10 min.
  - [ ] Status check requerido para merge a main.
  - [ ] Failures notifican a email/Slack del founder.

### [qa] WAPPY-00-12 — Smoke tests del setup ⟦parallel⟧
- **Puntos**: 2
- **Depende de**: WAPPY-00-08, WAPPY-00-09
- **Descripción**: Suite e2e mínima que valida: `/health` 200, `/ready` 200, `/api/v1/_test/translate` 200 con 3 idiomas, `/metrics` formato Prometheus. Corre en CI.
- **Criterios de aceptación**:
  - [ ] 4 tests e2e nuevos pasan.
  - [ ] Tests integrados al pipeline CI.
  - [ ] Cobertura reportada (opcional).

### [cybersecurity] WAPPY-00-13 — Setup gitleaks + secret scanning en CI
- **Puntos**: 2
- **Depende de**: WAPPY-00-11
- **Descripción**: Añadir step en CI que corre `gitleaks` sobre el repo. Falla el build si encuentra secrets. Configurar `.gitleaks.toml` con allowlist para falsos positivos (env-example values).
- **Criterios de aceptación**:
  - [ ] Step gitleaks en CI.
  - [ ] Test: commit con secret obvio (`AKIA...`) falla el build.
  - [ ] env-example y test fixtures en allowlist.

---

## Métricas del sprint

| Métrica | Target |
|---|---|
| Total story points | 32 |
| Tareas paralelizables (⟦parallel⟧) | 4 |
| Tareas backend | 5 |
| Tareas devops | 4 |
| Tareas qa | 1 |
| Tareas architect | 1 |
| Tareas team-lead | 2 |
| Tareas cybersecurity | 1 |

## Notas

- Este sprint no toca el módulo de Auth ni Tenancy. Esos van en S1 y S2.
- El stack Grafana puede sentirse over-engineered al principio. Es inversión a largo plazo (ADR-008).
- Si el VPS de observability no está listo, dejar todo corriendo en local + Railway free workers para Prometheus/Grafana hasta S21.
