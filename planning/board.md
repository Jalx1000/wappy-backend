# Board operativo

Estado en vivo del sprint en curso. Fuente de verdad para "qué se está ejecutando ahora mismo".
Detalle de cada tarea (descripción + criterios de aceptación) vive en `sprints/sprint-NN-*.md`.

## Convenciones

- **Estados**: `todo` · `ready` (dependencias resueltas) · `in_progress` · `review` (PR abierto) · `done` · `blocked`
- **Owner**: subagente que ejecuta. El founder revisa PRs y aprueba decisiones bloqueantes.
- **WIP cap**: 1 tarea `in_progress` por owner.
- Tareas con `⟦parallel⟧` son seguras de spawnear simultáneamente (tocan carpetas disjuntas).

---

## Sprint en curso: 00 — Foundations

**Inicio**: 2026-06-08 · **Fin previsto**: 2026-06-19 (10 días hábiles)
**Total SP**: 32

### Estado de tareas

| ID | Título | Owner | SP | Estado | Bloquea | Bloqueada por |
|---|---|---|---|---|---|---|
| WAPPY-00-01 | Kickoff + setup planning operativo | team-lead | 1 | `done` | 02 | — |
| WAPPY-00-02 | Definir layout de carpetas | architect | 2 | `ready` | — | 01 ✓ |
| WAPPY-00-03 | Fix husky pre-commit | devops | 1 | `ready` | 11 | — |
| WAPPY-00-04 | Extender docker-compose.yaml | devops | 2 | `ready` ⟦parallel⟧ | 07 | — |
| WAPPY-00-05 | docker-compose.observability.yaml | devops | 5 | `ready` ⟦parallel⟧ | — | — |
| WAPPY-00-06 | nestjs-pino + helmet + throttler | backend | 3 | `ready` ⟦parallel⟧ | 10 | — |
| WAPPY-00-07 | BullMQ + ioredis + queue base | backend | 3 | `todo` | 08 | 04 |
| WAPPY-00-08 | Endpoints /health y /ready | backend | 2 | `todo` | 12 | 07 |
| WAPPY-00-09 | nestjs-i18n bundles ES/EN/PT-BR | backend | 3 | `ready` ⟦parallel⟧ | 12 | — |
| WAPPY-00-10 | Exponer /metrics Prometheus | backend | 2 | `todo` | — | 06 |
| WAPPY-00-11 | GitHub Actions CI básico | devops | 3 | `todo` | 13 | 03 |
| WAPPY-00-12 | Smoke tests del setup | qa | 2 | `todo` | 14 | 08, 09 |
| WAPPY-00-13 | gitleaks + secret scanning | cybersecurity | 2 | `todo` | — | 11 |
| WAPPY-00-14 | Demo + retro | team-lead | 1 | `todo` | — | todas |

### Grafo de dependencias (ASCII)

```
01 (team-lead, kickoff)
 └── 02 (architect, layout)

03 (devops, husky fix) ───────────────┐
                                      ▼
04 (devops, compose) ──► 07 (backend, BullMQ) ──► 08 (backend, /health, /ready) ──┐
                                                                                  ▼
                                                                          12 (qa, smoke) ──► 14 (demo+retro)
09 (backend, i18n) ───────────────────────────────────────────────────────────────┘  ▲
                                                                                     │
06 (backend, pino+helmet+throttler) ──► 10 (backend, /metrics)                       │
                                                                                     │
05 (devops, observability stack) ────────────────────────────────────────────────────┤
                                                                                     │
03 ──► 11 (devops, CI) ──► 13 (cybersec, gitleaks) ──────────────────────────────────┘
```

### Wave plan

- **Wave 1 (ahora)**: `03`, `04`, `05`, `06`, `09` — 5 ramas paralelas, owners distintos, carpetas disjuntas.
- **Wave 2**: `02` (depende de 01), `07` (depende de 04), `10` (depende de 06), `11` (depende de 03).
- **Wave 3**: `08` (depende de 07), `13` (depende de 11).
- **Wave 4**: `12` (depende de 08 + 09).
- **Wave 5**: `14` (depende de todas).

### Coordinación de archivos compartidos

| Archivo | Tareas que lo tocan | Política de merge |
|---|---|---|
| `app.module.ts` | 06, 07, 08, 09, 10 | Serializar merges: 06 → 09 → 07 → 08 → 10. Cada owner rebase antes de PR. |
| `package.json` | 03 (?), 06, 07, 09, 10, 13 | Merges serializados por orden de aceptación. Reviewer chequea no-conflicto en deps. |
| `docker-compose.yaml` | 04 | Único owner (devops/04). 05 usa archivo separado, no conflicto. |
| `CLAUDE.md` | 02 | Único owner (architect/02). |
| `env-example` / `.env` | 04, 05, 06, 07, 11 | Cada owner añade su bloque al final con comentario `# WAPPY-00-XX`. Team-lead audita en review. |
| `.github/workflows/` | 11, 13 | 13 modifica el workflow de 11 — serializar. |

---

## Cadencia

- **Daily check-in**: 15 min, prompt agendado vía `/schedule` (días hábiles 09:00). Revisa board + bloqueos + recomienda siguiente spawn.
- **Mid-sprint review**: día 5.
- **Demo + retro**: día 10. Slot a confirmar por founder.

## Retro del sprint en curso

Pendiente. Se redacta en `retros/sprint-00.md` el día 10.
