# ADR 005 — Facturación manual el primer año

**Estado**: accepted
**Fecha**: 2026-06-07
**Decisor**: founder

## Contexto

Wappy es SaaS multi-tenant con planes Pro/Business/Enterprise. Hay que decidir el modelo de facturación para el primer año (~20-30 workspaces previstos).

Opciones:

1. **Stripe Billing desde día 1**: integración completa con subscriptions, prorrateo, dunning, customer portal. ~1-2 sprints + costos Stripe ($0 hasta cobrar, luego ~2.9% + $0.30 por transacción + $5/mo Tax).
2. **Lago (open-source)**: alternativa self-hosted a Stripe Billing. Sin fees pero requiere infra.
3. **Facturación manual**: founder genera factura cada mes, cliente paga por transferencia/Stripe Link/manual. El sistema solo tracker estado de suscripción.

## Decisión

**Adoptamos facturación manual durante el primer año** (sprints 0-21, hasta ~30 workspaces). Stripe Billing se difiere a **sprint 33 (v2)** cuando facturación manual deje de escalar.

### Modelo manual

- **Sistema interno**:
  - `Plan` entity con definición declarativa de tier + límites (`maxAgents`, `maxCustomObjects`, `aiUsdCap`).
  - `Subscription` (workspaceId, planId, status `trial|active|past_due|suspended|canceled`, trialEndsAt, currentPeriodStart/End, manuallyMarkedPaidUntil).
  - Cron diario que evalúa: si `manuallyMarkedPaidUntil < now()` → marca `past_due` → 7 días gracia → `suspended`.
- **Flujo del founder**:
  - Email mensual: "Tu factura: $X (3 agentes × $19 + base $39 = $96)".
  - Cliente paga vía Stripe Payment Link (sin Stripe Billing), transferencia o Mercado Pago.
  - Founder marca `manuallyMarkedPaidUntil = now() + 1 month` en admin panel.
- **Trial 7 días**: automático en signup; cron downgrade a `suspended` al expirar.
- **Upgrade/downgrade**: manual coordinado con founder por email.

## Consecuencias

### Positivas

- **Cero sprint cost** en MVP. Sprint 2 implementa solo el modelo de datos + cron de suspensión + UI mínimo admin. Total: 2 días vs ~10-15 días de Stripe Billing.
- **Cero fee** de Stripe Billing ($5/mo + 0.5% revenue) en revenue inicial bajo. Con 20 workspaces × $50 promedio = $1000 MRR, ahorro de ~$10/mo + variable.
- **Conversaciones directas con primeros clientes**: cada cobro = touchpoint para feedback. Insights cualitativos invaluables en fase de PMF.
- **Flexibilidad para experimentos de pricing**: ajustar precios per-customer sin tocar código de billing.
- **Compliance LatAm más fácil**: facturas custom para SAT México, AFIP Argentina, SII Chile, etc. desde el día 1, sin esperar features de Stripe.

### Negativas

- **No escala más allá de ~50 workspaces**. Cuando llegues a ese punto, manual = trabajo full-time. Hay que migrar a Stripe Billing antes.
- **Dunning manual**: si cliente no paga, no hay emails automáticos de reminder → posible churn por olvido.
- **No customer portal**: cliente no puede ver historial de facturas en la app. Si pide → email manual.
- **No webhooks de billing events**: no se puede automatizar lógica tipo "cuando paga, manda email de gracias". Workaround: email manual.
- **Trial sin tarjeta**: ratio de conversión trial→paid puede ser menor (clientes que prueban sin intención de pagar). Mitigación: signup pide datos de empresa (filtra serios).

### Mitigaciones

- **Email templates listos** para: bienvenida trial, alerta día 5 de trial, expiración trial, factura mensual, recordatorio impago, suspensión.
- **Admin panel interno** (built en S2): tabla de workspaces con estado, último pago, próximo vencimiento, botón "Mark Paid". Sin esto, el founder se quema.
- **Trigger Stripe Billing migration en métrica**: cuando `count(active workspaces) > 40` o el founder dedique más de 4h/semana a billing manual → arrancar S33.
- **Documentar el manual flow** en runbook (`docs/billing-manual-runbook.md`) para que el founder no se olvide pasos.
- **Tracker en spreadsheet** paralelo (Google Sheets) al inicio. Migrar a admin panel cuando tenga >10 workspaces.

## Alternativa rechazada: Stripe Billing desde día 1

Razones de rechazo:

- 1-2 sprints de scope en momento donde cada sprint cuenta.
- Hyperoptimization premature — no hay clientes aún.
- Forzar tarjeta en signup baja conversión de trial → en fase PMF, menos signups = menos data.
- Refunds, prorrateo, edge cases (cliente que cambia plan a mitad de mes con add-ons) son time-sinks.

Se evaluará en S33 cuando haya datos: cuánto tiempo gasta founder en billing manual, qué edge cases han aparecido, qué necesitan los clientes (customer portal, multi-seat self-service, etc.).

## Alternativa rechazada: Lago

Open-source, sin fees. Razones:

- Setup + ops añade complejidad equivalente a Stripe Billing.
- Comunidad más pequeña, menos ejemplos.
- Stripe es el gold standard en LatAm para SaaS — clientes confían más.

Se considerará si en v2 la economía no cierra con Stripe.

## Referencias

- Stripe Billing pricing page.
- ProfitWell research on trial-with-card vs trial-without-card conversion rates.
- Lago docs.

## Notas

Este ADR debe revisitarse al final de Q2 v1 (sprint 14 aprox.). Si en ese punto hay >25 workspaces activos, considerar adelantar S33 a v1.1.
