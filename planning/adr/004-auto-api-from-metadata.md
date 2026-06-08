# ADR 004 — Auto-API REST + GraphQL desde metadata

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + architect

## Contexto

Wappy permite custom objects ([[ADR-003]]). Cuando un workspace crea el object `Order`, el cliente espera **inmediatamente** poder hacer `GET /api/v1/orders` y `query { orders { ... } }` sin que un developer toque código.

Esto es lo que diferencia un platform builder (Twenty, Salesforce) de un CRM con custom fields (Intercom, Front).

Opciones:

1. **Auto-API completa**: motor que lee metadata y registra endpoints REST + tipos GraphQL dinámicamente. Cero código por object.
2. **CLI generator**: el cliente crea el object, luego corre `npm run generate:api -- --object Order`. Code-gen produce los archivos. Requiere redeploy.
3. **Sin auto-API**: el cliente accede a custom objects solo vía UI o vía un único endpoint genérico `/api/v1/custom/:object`. Pierde discoverability.

## Decisión

**Adoptamos Auto-API completa (opción 1)** para REST y GraphQL. Cero código por object, registro dinámico en runtime.

### Arquitectura

**Para REST**:
- Un módulo `AutoApiModule` que al boot lista todos los `ObjectDefinition` de cada tenant y registra rutas dinámicamente en el Nest router.
- Cuando un object se crea/modifica en runtime, se emite evento → handler refresca el router del tenant.
- Endpoints generados por object:
  - `GET /api/v1/{plural}` — list con `?filter=`, `?sort=`, `?page=`, `?perPage=`, `?search=`, `?include=`
  - `GET /api/v1/{plural}/:id`
  - `POST /api/v1/{plural}`
  - `PATCH /api/v1/{plural}/:id`
  - `DELETE /api/v1/{plural}/:id`
  - `POST /api/v1/{plural}/bulk/{create|update|delete}`
- **Validación**: DTOs generados al vuelo desde `FieldDefinition` usando `class-validator` decoradores programáticos.
- **Permisos**: el guard `MetadataPermissionGuard` lee `Role.permissions[objectKey]` para autorizar.
- **OpenAPI**: spec generado al vuelo por workspace, expuesto en `/docs/{workspaceSlug}`.

**Para GraphQL**:
- Apollo Server con `buildSchema` dinámico desde metadata.
- Resolvers genéricos que ejecutan contra `MetadataService.query(objectKey, args)`.
- DataLoader anti N+1 para relaciones.
- Subscriptions sobre `object.{created|updated|deleted}` → conectadas al event bus.

**Common para ambos**:
- Query engine único: `MetadataQueryService` traduce filtros/sorts/includes a TypeORM QueryBuilder contra el schema del tenant.
- Filter DSL: subset de operadores (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, `startsWith`, `isNull`, `between`).
- Pagination cursor-based por default; offset disponible.

### Reglas

- **Versión congelada**: `/api/v1` no cambia contract. Cambios breaking → `/api/v2` (no antes de 2027).
- **Endpoints sistema fijos**: `/api/v1/conversations`, `/api/v1/contacts`, `/api/v1/members`, etc. siguen siendo controllers Nest tradicionales (rendimiento + customización). Pero también aparecen en la metadata para que GraphQL + filtros funcionen uniformemente.
- **Naming**: `objectKey` plural inferido vía librería de pluralización (con override manual posible).
- **Rate limit**: per plan + per workspace + per IP (via `@nestjs/throttler` con Redis).

## Consecuencias

### Positivas

- **Killer feature**: el cliente crea `Property` y en 5 segundos tiene API REST + GraphQL + Swagger + tipos disponibles. Esto vende.
- **DRY extremo**: una sola implementación del query engine, una sola validación, una sola lógica de permisos. Bug fixes se aplican a todos los objects.
- **Discoverability**: developers del cliente pueden navegar Swagger/GraphQL playground y descubrir la API. No requiere docs custom.
- **Consistency**: todos los objects se comportan igual. No hay endpoints "raros" porque alguien los escribió a las 3am.
- **GraphQL Federation friendly**: el schema dinámico es la base ideal para subscriptions y para apps móviles que quieran fetch eficiente.

### Negativas

- **Complejidad alta**: el query engine es código denso. Bugs aquí afectan a todo. Tests pesados.
- **Performance overhead**: filter parser + DTO builder dinámico tienen costo per request. Mitigación: cache de schemas por objectKey + LRU del DTO class compilado.
- **Customization limitada**: si el cliente necesita un endpoint custom (`POST /orders/:id/fulfill`), no encaja en auto-API. Solución: permitir registrar "extension endpoints" manualmente (sprint v1.1 o v2).
- **Hot-reload de rutas**: cuando un object se crea, hay que refrescar el router sin reiniciar. Nest soporta esto pero requiere cuidado con módulos lazy.
- **Validación dinámica**: `class-validator` está pensado para clases statically defined. Hay que usar `validateOrReject` programático con metadata custom — más lento que decoradores estáticos.
- **GraphQL schema reload**: el cliente Apollo en frontend cachea el schema. Refresh requiere `__refresh` mutation o WebSocket hint.

### Mitigaciones

- **Cache LRU de schemas compilados** per tenant + objectKey. Invalidado por evento `metadata.changed`.
- **Tests adversarios** de filter parser: inputs raros (`$ne: { $where: '1=1' }`), SQL injection attempts.
- **DataLoader obligatorio** en resolvers. Tests anti N+1 con assertions de query count.
- **Extension hooks**: API explícita `@OnBefore('create', 'Order')` / `@OnAfter('update', 'Order')` para añadir lógica sin perder auto-CRUD. Diseñado en S5, expuesto en v1.1.
- **Schema reload**: WebSocket evento `metadata:invalidated` para que frontend sepa que el GraphQL schema cambió → refetch.

## Alternativa rechazada: CLI generator

CLI generator (opción 2) tenía la ventaja de generar código real, debuggable, con type safety completo en build-time. Razones de rechazo:

- Cliente no puede usar la API hasta redeploy → fricción terrible.
- El propósito de Custom Objects es self-service; CLI rompe eso.
- Code-gen genera mucho código casi idéntico → harder to maintain que un engine único.

CLI generator queda como herramienta interna para "promover" un custom object popular a object sistema (con código real custom) en v2+.

## Referencias

- Twenty CRM: `packages/twenty-server/src/engine/api/`.
- Hasura GraphQL Engine architecture (similar approach).
- PostgREST (auto-API REST desde Postgres schema).
- Salesforce Apex auto-generation patterns.

## Notas

Este engine es lo que más demanda **architect time** durante sprints 5-6. Vale la pena la inversión: es el diferenciador #1 del producto.
