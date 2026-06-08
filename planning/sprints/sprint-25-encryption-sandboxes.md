# Sprint 25 — Field-level encryption + Sandboxes

**Duración**: 2 semanas
**Objetivo**: Compliance pesado (HIPAA, PCI) + dev/staging environments per workspace.
**Definition of Done del sprint**:
- Field-level encryption con per-workspace KMS key.
- Fields marcados `isEncrypted=true` cifrados at rest, decrypted on read con permission.
- Sandboxes: clone de workspace (subset data, schema separado).
- Promote sandbox → prod con migration.

**Demo**: marcar field "ssn" en Contact como encrypted; insert value; verificar cifrado en DB; query desencripta; crear sandbox de acme; modificar metadata; promote a prod.

---

## Tareas

### [team-lead] WAPPY-25-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-25-12 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-25-02 — Diseño Field-level encryption + KMS
- **Puntos**: 5
- **Descripción**:
  - Key management: per-workspace key derivada de master + workspaceId via HKDF (MVP), futuro AWS KMS / Cloudflare R2 Keys.
  - Encryption: AES-256-GCM per field.
  - Schema: column `<field>_enc bytea` + `<field>_iv bytea` reemplaza columna plana cuando `isEncrypted=true`.
  - DDL migration al toggle encryption on existing field (re-encrypt all rows).
  - Query: decrypt on read, encrypt on write.

### [architect] WAPPY-25-03 — Diseño Sandboxes
- **Puntos**: 5
- **Descripción**:
  - `Sandbox` (parentWorkspaceId, schemaName `sandbox_acme`, status creating|ready|promoting, createdAt).
  - Clone: dump structure + sample (limit 10%) data.
  - Promote: diff metadata between sandbox + prod, apply changes.
  - Aislamiento: sandbox tiene su propio tenant context.

### [backend] WAPPY-25-04 — Field-level encryption engine
- **Puntos**: 8
- **Descripción**:
  - KMS service: derive key, encrypt/decrypt.
  - Hook into MetadataService: toggle encryption triggers migration.
  - Hook into auto-API: encrypt before insert, decrypt after read.

### [backend] WAPPY-25-05 — Migration: re-encrypt existing field
- **Puntos**: 5
- **Descripción**: Background job que itera rows, encrypt, swap column. Atomic per row.

### [backend] WAPPY-25-06 — Sandbox creation (clone workspace)
- **Puntos**: 8
- **Descripción**:
  - DDL: `CREATE SCHEMA sandbox_<slug>` + copy structure.
  - Sample data (10% random subset).
  - Routing: sandbox accessible via `sandbox.{slug}.wappy.dev` (subdomain prefix).

### [backend] WAPPY-25-07 — Sandbox promote (diff + apply)
- **Puntos**: 5
- **Descripción**: Calculate diff metadata sandbox vs prod. Apply DDL changes to prod. Optional: copy specific data (configurations, automations, dashboards).

### [backend] WAPPY-25-08 — Endpoints Sandbox CRUD + promote
- **Puntos**: 3

### [qa] WAPPY-25-09 — Tests Encryption
- **Puntos**: 5
- **Descripción**: Cifrado correcto en DB. Decrypt correcto. Migration re-encrypt funciona. Permission denied no descifra.

### [qa] WAPPY-25-10 — Tests Sandboxes
- **Puntos**: 5
- **Descripción**: Clone, isolation (no cross-contamination), promote success + conflicts.

### [cybersecurity] WAPPY-25-11 — Audit Encryption + Sandboxes
- **Puntos**: 5
- **Descripción**: Key derivation security. No key leakage in logs. Sandbox isolation. Promote safety (no accidental prod overwrite).

---

## Métricas | Total story points | 56 |
