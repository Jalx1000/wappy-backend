# ADR 002 — TypeORM como ORM (no Prisma)

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + architect

## Contexto

El boilerplate fork (brocoders/nestjs-boilerplate) usa **TypeORM 0.3**. El prompt original del design system de Wappy sugería Prisma. Hay que decidir si migrar a Prisma o mantenerse en TypeORM.

Factores:
- Wappy requiere schema-per-tenant ([[ADR-001]]) + DDL runtime para Custom Objects ([[ADR-003]]).
- Prisma genera client desde un schema declarativo en build-time → fricciona con DDL runtime y schemas dinámicos.
- TypeORM permite DataSource con `schema` configurable per-query y soporta queries raw o QueryBuilder dinámicos.
- El repo ya tiene Hexagonal con TypeORM cableado, generadores Hygen que producen entidades TypeORM, migrations TypeORM, e2e tests funcionales.

## Decisión

**Mantenemos TypeORM 0.3**. Descartamos migración a Prisma.

### Razones técnicas

- **DDL runtime**: TypeORM permite ejecutar `CREATE TABLE`, `ALTER TABLE` desde código vía `QueryRunner` sin regenerar el client. Prisma exigiría regenerar el client y reiniciar la app cada vez que el cliente añade un custom object.
- **Schema dinámico**: TypeORM `Repository.find({ where, schema: 'tenant_acme' })` es feasible (con custom QueryBuilder). Prisma asume schema único en `schema.prisma`.
- **Hexagonal compatibility**: las entidades TypeORM viven en `infrastructure/persistence/relational/entities/` aisladas del domain. Cambiar de ORM requeriría reescribir todos los mappers, repositorios y migrations existentes.
- **Generadores Hygen**: los templates en `.hygen/generate/relational-resource/` están atados a TypeORM. Reescribir = 1-2 sprints.

### Razones de costo

- Migración a Prisma: 2-3 sprints solo en setup + reescritura. **No agrega valor de negocio**.
- TypeORM 0.3 es estable, mantenido, suficiente para los próximos 3 años.

## Consecuencias

### Positivas

- **Zero migration cost**: arrancamos en S0 sin tocar nada del stack persistencia.
- **Custom Objects naturales**: TypeORM `QueryRunner.createTable()` es la API que el motor de metadata necesita.
- **Hexagonal preservado**: services siguen hablando con ports, adapters TypeORM cambian su implementación interna sin afectar el resto.
- **Generadores Hygen siguen sirviendo** para entidades sistema.

### Negativas

- **TypeORM tiene quirks** (lazy loading, cascade behaviors, eager loading) que requieren disciplina. Documentar en CLAUDE.md.
- **GraphQL auto-generation** ([[ADR-004]]) tiene que escribirse a mano contra QueryBuilder dinámico (Prisma habría dado más para empezar via `nexus-prisma` o similar). Aceptable porque el modelo es shared-schema "para custom" + tenant schema "para sistema" — no encajaría tampoco con Prisma fuera de la caja.
- **TypeORM no tiene un equivalente directo a Prisma Studio** para inspección visual. Mitigación: Adminer (ya en compose) + pgAdmin local.

### Mitigaciones

- **Snapshot tests** de SQL generado por TypeORM para repositorios críticos. Detecta cambios accidentales de query.
- **Pin TypeORM version** en `package.json` con `~` (no `^`). Upgrade controlado.
- **Documentar patterns** en CLAUDE.md (eager vs lazy, when to use raw, when to use QueryBuilder).

## Referencias

- TypeORM `QueryRunner` docs.
- Prisma issue #3691 (dynamic schemas) — still open as of 2026.
- Issue del repo: CLAUDE.md ya documenta este stack.

## Notas

Si en v3 (post-2028) TypeORM 0.3 quedara abandonado y no hubiera path de upgrade limpio, evaluar superseder con Drizzle ORM (más moderno, type-safe, DDL-friendly). Pero no hacerlo preventivamente.
