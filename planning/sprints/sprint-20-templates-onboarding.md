# Sprint 20 — Templates verticales + Onboarding wizard

**Duración**: 2 semanas
**Objetivo**: Time-to-value de 5 minutos. Cliente elige vertical en signup, workspace queda armado con custom objects + automations + dashboards prefab. Setup wizard guía pasos clave.
**Definition of Done del sprint**:
- 4 templates verticales: Real Estate, Healthcare, E-commerce, Logistics.
- Template seeder: crea custom objects, fields, relations, automations base, dashboards.
- Sample data toggle (10-20 records por object).
- Onboarding wizard 5 pasos (matching el "Setup 0/5" del screenshot).

**Demo**: signup nuevo con template "Real Estate" → workspace tiene Property + Showing + Offer + sample data + dashboard Real Estate Sales. Wizard guía: connect-channel → invite-team → install-widget → create-article → customize-brand.

---

## Tareas

### [team-lead] WAPPY-20-01 — Kickoff
- **Puntos**: 1

### [team-lead] WAPPY-20-13 — Demo + retro
- **Puntos**: 1

### [architect] WAPPY-20-02 — Diseño Template Seeder
- **Puntos**: 3
- **Descripción**:
  - Template = manifest JSON declarativo:
    - objects: [{ key, label, fields, relations }]
    - automations: [{ name, trigger, actions }]
    - dashboards: [{ name, widgets }]
    - articles: [{ collection, title, body }]
    - sampleData: [{ object, records }]
  - Seeder: itera manifest, llama MetadataService + automations + etc.

### [data-analyst] WAPPY-20-03 — Diseñar contenido de 4 templates verticales
- **Puntos**: 5
- **Descripción**: Para cada vertical, definir:
  - Real Estate: Property (campos: type, address, price, bedrooms, status), Showing (date, agent, contact), Offer (amount, status, contact, property).
  - Healthcare: Patient (name, dob, insurance), Appointment (date, doctor, patient, type), Treatment (patient, diagnosis, prescription).
  - E-commerce: Order (number, total, status, customer), OrderItem (order, product, qty), Return (order, reason, status).
  - Logistics: Shipment (tracking, status, origin, destination), Route (driver, vehicle, shipments), Vehicle (plate, capacity).
  - 5+ automations por vertical.
  - 1 dashboard por vertical con 4-6 widgets.

### [backend] WAPPY-20-04 — Template Seeder service
- **Puntos**: 5
- **Descripción**: `TemplateSeederService.applyTemplate(workspaceId, templateKey)` orquesta. Idempotente (skip si ya aplicado).

### [backend] WAPPY-20-05 — Manifest files de los 4 templates
- **Puntos**: 5
- **Descripción**: `src/templates/real-estate.manifest.json`, etc. Manifest schema validated.

### [backend] WAPPY-20-06 — Sample data generation
- **Puntos**: 3
- **Descripción**: Por template, 10-20 records demo per object con datos realistas (Faker.js).

### [backend] WAPPY-20-07 — Signup wizard: template selection
- **Puntos**: 3
- **Descripción**: Modificar `POST /api/v1/auth/signup` para aceptar `templateKey` opcional. Si presente, dispara seeder post-workspace-creation.

### [backend] WAPPY-20-08 — Onboarding wizard state + endpoints
- **Puntos**: 5
- **Descripción**:
  - `WorkspaceOnboardingState` jsonb en Workspace settings.
  - 5 steps: connect-channel, invite-team, install-widget, create-article, customize-brand.
  - Endpoints: `GET /api/v1/workspace/onboarding`, `POST /api/v1/workspace/onboarding/:step/complete`.
  - Progress visible al frontend para "Setup 0/5" badge.

### [backend] WAPPY-20-09 — Pre-crear Products como custom object base
- **Puntos**: 2
- **Descripción**: Cualquier workspace nuevo (con o sin template) crea object Products con campos básicos (sku, name, price, currency, imageFileId).

### [qa] WAPPY-20-10 — Tests Templates
- **Puntos**: 5
- **Descripción**: Apply cada template → verificar objects creados + fields + relations + automations + sample data.

### [qa] WAPPY-20-11 — Tests Onboarding wizard
- **Puntos**: 3
- **Descripción**: State persistence. Complete steps. Skip optional.

### [data-analyst] WAPPY-20-12 — Tracking de adopción templates
- **Puntos**: 2
- **Descripción**: Event `workspace.template_applied` + `onboarding.step_completed`. Dashboard Grafana: % workspaces que completan onboarding.

---

## Métricas | Total story points | 43 |

## Notas

- Templates son tu ancla de marketing. "Wappy para Inmobiliarias" vende mucho más.
- Sample data se borra opcional con un toggle "modo producción".
- Más verticales en v2 (Education, Financial, B2B SaaS, etc., en backlog).
