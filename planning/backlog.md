# Backlog

Features explícitamente diferidos de v1 (MVP). Documentados para que (a) no se cuelen al MVP por accidente y (b) cuando llegue el momento ya tengamos contexto del por qué se difirió.

Formato: `[ ] [tier] feature — racional del diferimiento → sprint estimado`.

---

## v1.1 — Enterprise (Sprints 22-26)

Diferidos por: clientes enterprise no entran antes de tener producto probado en beta. Sin SSO/SCIM/audit avanzado no se cierra contrato enterprise.

- [ ] [v1.1] **SSO SAML + OIDC** — requisito hard de cualquier customer enterprise (>50 agentes). Implementación con `passport-saml`. → S22.
- [ ] [v1.1] **SCIM provisioning** — Okta/Azure AD pushean users a Wappy. Sin esto, IT enterprise hace onboarding manual. → S23.
- [ ] [v1.1] **Audit log inmutable extendido** — append-only, 2+ años retention, export a SIEM (JSONL stream). MVP tiene audit pero corto + sin export. → S23.
- [ ] [v1.1] **White-label + Custom Domain** — `support.acme.com` → workspace acme con TLS automático vía Cloudflare Custom Hostnames. → S24.
- [ ] [v1.1] **Field-level encryption** — per-workspace KMS key, encryption-at-rest selectivo. Compliance HIPAA/PCI necesita esto. → S25.
- [ ] [v1.1] **Sandboxes** — clone de workspace con subset de data, promote a prod. Permite a admins testear cambios. → S25.
- [ ] [v1.1] **Marketplace MVP** — apps third-party con manifest + OAuth + review manual. Genera ecosistema. → S26.
- [ ] [v1.1] **Calendar sync Google/Outlook** — bidirectional sync via OAuth. → S22-S26 (encajable).
- [ ] [v1.1] **Map view** sobre objects con campo location. → S22-S26.
- [ ] [v1.1] **Dashboard embed** en sites externos via iframe firmado. → S22-S26.
- [ ] [v1.1] **Field-level permissions UI** — el motor existe en S5; falta UI para configurarlo. → S22-S26.
- [ ] [v1.1] **Favorites** — Member marca records favoritos. Low effort, low signal de necesidad. → cuando haya feedback.

---

## v2 — Post-launch (Sprints 27+)

Diferidos por: scope masivo + dependen de aprendizaje de uso real. No comprometer fechas hasta tener data.

### Mobile

- [ ] [v2] **Mobile backend support** — push APNs/FCM, offline sync con conflict resolution (LWW + version vectors), identify-from-mobile, batch endpoints. La app móvil (`01.app/`) sigue su propio roadmap. → S27.

### AI avanzado

- [ ] [v2] **AI generation** — generación de artículos Help Center, plantillas de campaigns, snippets de bots desde prompt. → S28.
- [ ] [v2] **AI extraction** — sentiment + intent + auto-fill de custom fields desde conversaciones. → S28.
- [ ] [v2] **Embeddings + RAG sobre Help Center** — búsqueda semántica, "ask Wappy" sobre KB del workspace. → S28.
- [ ] [v2] **AI Copilot para Bot Builder** — sugerir nodos siguientes mientras construyes el flow. → S28+.
- [ ] [v2] **Per-workspace LLM fine-tuning** — opt-in para Enterprise, mejora tono del workspace. → v2 alto.

### Workflows y extensibilidad

- [ ] [v2] **Approval workflows** — multi-step con asignados, paralelos vs secuenciales. → S29.
- [ ] [v2] **Custom JavaScript functions** — V8 isolate server-side, eval con timeout y memory cap. → S31.
- [ ] [v2] **Real-time co-editing CRDT** — Yjs sobre comments/notes. → S32.
- [ ] [v2] **Computed fields** — Airtable-style (formula, lookup, rollup). El engine existe parcial; la UI no. → v2.
- [ ] [v2] **Custom triggers desde UI** — el cliente define triggers nuevos en código JS sandboxed. → v2.

### Billing y monetización

- [ ] [v2] **Stripe Billing integration** — sustituye facturación manual cuando >50 workspaces. → S33.
- [ ] [v2] **Usage-based add-ons billing** — auto-charge por overage de AI, storage R2, WhatsApp templates. → S33.
- [ ] [v2] **In-app upgrade flow** — wizard de upgrade Pro→Business con prorrateo. → S33.
- [ ] [v2] **Invoicing custom** — generador de facturas PDF para LatAm compliance. → S33.

### Multi-region y compliance

- [ ] [v2] **Multi-region** — Postgres EU + NA, workspace ligado a región durante signup. GDPR data residency. → S34+.
- [ ] [v2] **GDPR right-to-erasure automatización** — endpoint que dropea schema completo del workspace + purga backups (con audit). → S34+.
- [ ] [v2] **Data export en formato portable** — export completo de workspace para portability rights. → S34+.
- [ ] [v2] **SOC2 Type II prep** — runbooks, evidencias, vendor security reviews. → v2 alto.
- [ ] [v2] **HIPAA compliance** — BAA con vendors (Resend, R2, Anthropic), encryption-at-rest extendido, audit reforzado. → v2 alto.

### Canales adicionales

- [ ] [v2] **Messenger BYO** — análogo a WhatsApp pero con Page tokens. → S27+.
- [ ] [v2] **Instagram DM BYO** — Messaging API + Basic Display. → S27+.
- [ ] [v2] **Telegram** — bot API. → v2.
- [ ] [v2] **SMS (Twilio BYO)** — alternativa para mercados sin WhatsApp dominante. → v2.
- [ ] [v2] **Voice (Twilio Voice + transcripción + AI)** — call deflection. → v2 alto.
- [ ] [v2] **Live chat por video (Daily.co o Zoom embebido)** — Enterprise. → v2 alto.

### Templates verticales (post v1)

v1 lanza con 4 templates (Real Estate, Healthcare, E-commerce, Logistics). Estos vienen después según traction:

- [ ] [v2] Template **Education** — Student, Course, Enrollment, Assignment.
- [ ] [v2] Template **Financial Services** — Client, Account, Transaction, Investment.
- [ ] [v2] Template **B2B SaaS** — Account, Opportunity, Subscription, MRR Tracking.
- [ ] [v2] Template **Restaurant / Food** — Reservation, Menu, Order, Delivery.
- [ ] [v2] Template **Travel / Tourism** — Booking, Itinerary, Destination, Tour.

### Custom Objects avanzado

- [ ] [v2] **Computed columns en Postgres** — para fields formula con índices materializados. → v2 medio.
- [ ] [v2] **Time-series objects** — optimización para custom objects que solo agregan (eventos, telemetría). → v2.
- [ ] [v2] **Object versioning + rollback** — historial de cambios de cada record con restore. → v2.
- [ ] [v2] **Imports recurrentes** — sync desde Google Sheets, S3, FTP. → v2.
- [ ] [v2] **API SDKs oficiales** — JS, Python, Ruby, PHP. → v2.

### Advanced WhatsApp

- [ ] [v2] **Plantillas con rich media** — image header, buttons (quick reply + URL + call), list messages. → S34+.
- [ ] [v2] **WhatsApp Business Profile management** — sync nombre, descripción, foto desde Wappy. → v2.
- [ ] [v2] **WhatsApp Flows** — integración con Meta Flows (forms en chat). → v2.
- [ ] [v2] **Calling on WhatsApp** — cuando Meta abra el API. → v2 según roadmap Meta.

### Observabilidad y operaciones

- [ ] [v2] **Migración de observabilidad a SaaS** — si Grafana self-hosted se vuelve burden, migrar a Better Stack / Grafana Cloud. → cuando duela.
- [ ] [v2] **Status page automatizada** — incidentes auto-detectados publican a status.wappy.dev. → v2.
- [ ] [v2] **Chaos engineering** — Toxiproxy + chaos tests en staging. → v2.
- [ ] [v2] **Auto-scaling agressive** — workers BullMQ que escalan por queue depth. → v2.

---

## Ideas sueltas (sin priorizar, sin sprint asignado)

Las ideas pueden venir del founder, del equipo o de feedback de clientes. Aquí viven hasta que se promueven a v1.1 o v2 o se descartan.

- [ ] **Chrome extension** que abre conversación de Wappy desde cualquier site visitando un Contact.
- [ ] **Slack notification per Member** (no por workspace) con DM directo.
- [ ] **AI-powered tagging** — sugerir tags al final de cada conversación.
- [ ] **Conversation merge** — combinar 2 conversaciones del mismo Contact.
- [ ] **Conversation split** — separar mensajes off-topic en nueva conversación.
- [ ] **Smart routing** — auto-asignación basada en skills (Member tiene `skills: ['billing', 'spanish']`).
- [ ] **Conversation translation** — traducir mensajes entrantes/salientes en tiempo real (LLM).
- [ ] **Customer health score** — métrica computada agregando NPS, CSAT, lifetime spend, days since contact.
- [ ] **Conversation outcome tagging** — al resolver, tag de resultado (solved/escalated/refunded/lost).
- [ ] **Macros con condiciones** — macro que solo aparece si conversation tiene tag X.
- [ ] **Snoozed reminders smart** — sugerir snooze times basado en patterns del agente.
- [ ] **Help center analytics** — qué artículos no funcionan (alto bounce, low helpful).
- [ ] **Article suggestions inside conversation** — copilot sugiere artículos relevantes al mensaje del cliente.
- [ ] **Bulk message scheduler** — outbound a contactos seleccionados, sin ser campaña formal.
- [ ] **Conversation export** — PDF transcript para compliance / legal.
- [ ] **CRM email sequences** — drip campaigns timed por contact attribute.
- [ ] **Visitor identification** — fingerprint del widget para identificar visitor anónimo entre sessions.

---

## Cómo se mueve algo de aquí a un sprint

1. Founder o team-lead decide promoverlo (basado en feedback de clientes, métricas, o decisión estratégica).
2. Architect evalúa diseño y posibles dependencias (¿necesita nuevo módulo? ¿bloquea otro?).
3. Se crea entrada en el sprint correspondiente (`sprints/sprint-NN-*.md`) con tareas detalladas.
4. Se borra el bullet de `backlog.md`.
5. Si se descarta definitivamente, se mueve a sección "Descartados" con razón.

---

## Descartados

(vacío por ahora — se llenará con learnings post-launch)
