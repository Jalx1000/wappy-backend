# ADR 006 — Cloudflare R2 para storage

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder + devops

## Contexto

Wappy almacena: adjuntos de mensajes, logos de workspaces, imágenes de productos, attachments de records, exports de reports, backups de configuración. Hay que decidir el storage.

Opciones:

1. **AWS S3**: gold standard. $0.023/GB-mes + **egress $0.09/GB**. Egress duele en producto con chat (clientes descargando imágenes).
2. **Cloudflare R2**: S3-compatible. $0.015/GB-mes + **egress $0** (cero). Bucket ya creado (`wappy-attachments-dev`).
3. **MinIO self-hosted** en Railway: gratis-ish (paga Railway compute + volumen). Opera tu propia infra.
4. **Local filesystem**: solo dev.

## Decisión

**Adoptamos Cloudflare R2 desde el día 1**, tanto para dev como para prod. MinIO descartado. Local filesystem solo para tests locales sin red.

### Setup

- **Buckets**:
  - `wappy-attachments-dev` (ya creado)
  - `wappy-attachments-prod` (crear al lanzar)
  - `wappy-backups-prod` (crear al lanzar; backups de Postgres dumps)
- **Driver**: usar el `s3-presigned` driver existente del boilerplate (`src/files/infrastructure/uploader/`), con env vars apuntando a R2:
  - `AWS_S3_ENDPOINT=https://<accountId>.r2.cloudflarestorage.com`
  - `AWS_S3_FORCE_PATH_STYLE=true`
  - `AWS_S3_REGION=auto`
  - `ACCESS_KEY_ID` + `SECRET_ACCESS_KEY` desde R2 dashboard.
- **Path convention**: `{workspaceId}/{targetType}/{targetId}/{fileId}-{filename}`. Workspace ID en el path es **defense-in-depth** (además del check de propiedad antes de firmar URL).
- **Presigned URLs**:
  - Upload: TTL 5 min, content-length-range para limitar tamaño según plan.
  - Download: TTL 1 hora.
  - Verificación de propiedad **siempre** antes de firmar (no confiar solo en path).
- **MIME whitelist**: lista declarativa por tipo de target. `.exe`, `.app`, `.scr`, `.bat` rechazados. Avatares limitados a image/*.
- **Max size per plan**:
  - Pro: 25 MB por archivo, 5 GB total per workspace.
  - Business: 100 MB por archivo, 50 GB total.
  - Enterprise: 500 MB por archivo, 1 TB total.
  - Overage R2: $0.20/GB extra.

### Buckets adicionales (futuro)

- `wappy-helpcenter-images` por workspace público (S10).
- `wappy-exports` para reports CSV/PDF generados (S16).

## Consecuencias

### Positivas

- **Cero egress fees**: en chat real, los clientes descargan imágenes/files constantemente. Con S3, 100 GB/mes de egress = $9/mes solo en egress. R2 = $0. Ahorro multiplicativo al escalar.
- **S3-compatible API**: el driver `s3-presigned` del boilerplate funciona sin modificar. AWS SDK funciona con endpoint custom.
- **Cloudflare-friendly**: ya estamos en Cloudflare para DNS/CDN. Mismo dashboard, mismo billing.
- **Latencia global decente**: R2 se sirve desde el edge de Cloudflare. Mejor que S3 us-east desde LatAm.
- **Cero ops**: vs MinIO que requiere mantener un contenedor extra, monitoring de espacio, backups.
- **Free tier generoso**: 10 GB storage + 1M Class A ops/mo + 10M Class B ops/mo. MVP entero entra ahí.

### Negativas

- **No tan probado como S3** en producción a gran escala (R2 GA fue 2022). Posibles incidentes Cloudflare-wide nos afectan.
- **Missing features de S3**: no soporta Object Lock, no soporta Glacier-tier (no aplica para Wappy todavía).
- **Egress a otra región**: si futuro multi-region añade compute en EU, requests R2 → EU egress cero pero latencia depende del POP de Cloudflare.
- **Dependencia adicional con Cloudflare**: ya estamos atados a CF para DNS/TLS/proxy. Aumenta el blast radius si CF cae.

### Mitigaciones

- **Backup cross-provider**: backups críticos también van a Backblaze B2 (también con egress libre o cap alto) semanalmente. Cubre escenario "Cloudflare account suspended".
- **Status page monitoring**: alerta si Cloudflare status page reporta issue R2 → degraded mode (cliente puede leer pero no subir).
- **Driver abstracto**: el port `FileStorage` permite swap a S3 en horas si fuera necesario. Test cross-driver en CI.
- **Lifecycle policies**: R2 soporta lifecycle (delete después de N días). Configurar para `exports/` (TTL 7 días).

## Alternativa rechazada: AWS S3

Razones:

- Egress fees son matadoras para producto de chat con media.
- Necesitamos un CDN encima de S3 (CloudFront u otro) para latencia LatAm decente → más infra.
- R2 da el 95% de las features que necesitamos a la mitad de costo.

S3 se reconsiderará si:
- R2 tiene un downtime mayor que erosione confianza.
- Necesitamos features S3-only (Glacier, Object Lock, Strong Consistency cross-region).

## Alternativa rechazada: MinIO self-hosted

Razones:

- Suma 1 contenedor + 1 volumen + monitoring.
- Backups son responsabilidad del founder.
- Costo Railway storage > costo R2 en cualquier escala.
- Dev experience peor (no edge, no CDN, no presigned URLs out-of-the-box).
- Total cost of ownership > R2.

MinIO útil solo en setup local sin red (raro). Para eso ya tenemos `FILE_DRIVER=local`.

## Referencias

- Cloudflare R2 pricing page.
- AWS S3 vs Cloudflare R2 comparison (Cloudflare blog 2022).
- Backblaze B2 como backup secondary.

## Notas

Migrar de R2 → otro provider es mecánico (copy bucket + update env vars + presigned URLs caducan). Compromiso bajo de lock-in.
