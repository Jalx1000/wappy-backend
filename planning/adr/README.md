# Architecture Decision Records

Decisiones arquitectónicas no triviales que el equipo no puede revertir trivialmente. Cada ADR sigue un formato estándar (Status / Context / Decision / Consequences) y se referencia desde los sprints que la materializan.

## Convenciones

- Numeración secuencial `NNN-titulo-kebab-case.md` (001, 002...).
- Estado: `proposed | accepted | superseded | deprecated`.
- Una ADR no se edita después de aceptada; se supera con otra ADR que la deprecate.
- Si una decisión depende de otra, se referencia con `[[ADR-NNN]]`.

## Índice

| ADR | Título | Estado |
|---|---|---|
| 001 | Schema-per-tenant en Postgres | accepted |
| 002 | TypeORM como ORM (no Prisma) | accepted |
| 003 | Custom Objects con columnas reales (no JSONB) | accepted |
| 004 | Auto-API REST + GraphQL desde metadata | accepted |
| 005 | Facturación manual el primer año | accepted |
| 006 | Cloudflare R2 para storage (no MinIO/S3) | accepted |
| 007 | AI Copilot con cap por workspace | accepted |
| 008 | Observabilidad self-hosted con Grafana stack | accepted |
