# Runbook: Observability Stack (WAPPY-00-05)

**Trigger**: Observability stack is down / services unreachable / disk full / rolling update needed.

---

## Ports reference

| Service       | Host port | URL                    |
|---------------|-----------|------------------------|
| Grafana       | 3001      | http://localhost:3001  |
| Loki          | 3100      | http://localhost:3100  |
| Prometheus    | 9090      | http://localhost:9090  |
| Tempo         | 3200      | http://localhost:3200  |
| Glitchtip     | 9000      | http://localhost:9000  |
| Uptime Kuma   | 3002      | http://localhost:3002  |

---

## Start / stop

```bash
# Start all observability services in background
docker compose -f docker-compose.observability.yaml up -d

# Stop (preserves volumes)
docker compose -f docker-compose.observability.yaml down

# Destroy including volumes (destructive — loses Grafana dashboards + Glitchtip data)
docker compose -f docker-compose.observability.yaml down -v
```

**Prerequisite**: the main stack must be running first so the `02back_default` external network exists:

```bash
docker compose up -d   # main stack
docker compose -f docker-compose.observability.yaml up -d
```

---

## First-boot Glitchtip setup

1. Navigate to http://localhost:9000/register
2. Create the superuser account (email + password).
3. Create an organization → create a project → copy the DSN.
4. Set `SENTRY_DSN=<dsn>` in your `.env` and restart the API.

---

## Verify Promtail is shipping logs

```bash
# Check Promtail targets
curl -s http://localhost:9080/targets | python3 -m json.tool | head -40

# Or view Promtail container logs
docker logs wappy-promtail --tail 50
```

Logs should appear in Grafana → Explore → Loki → `{container="wappy-api"}`.

---

## Verify Prometheus is scraping the API

1. Open http://localhost:9090/targets
2. `wappy_api` target should show State = UP.
3. If DOWN: ensure the main stack is running and API has `GET /metrics` (WAPPY-00-10).

---

## Rollback path

All services are stateless beyond named Docker volumes. Rollback = revert the compose file + config files via `git revert`, then:

```bash
docker compose -f docker-compose.observability.yaml up -d --force-recreate
```

Estimated time: < 5 minutes. Volume data is preserved across restarts.

---

## Disk full — Loki

Loki retention is configured for 30 days in `observability/loki/loki-config.yaml`. If disk fills before compaction runs:

```bash
# Check volume size
docker system df -v | grep wappy_loki

# Force compactor to run (Loki admin API)
curl -X POST http://localhost:3100/loki/api/v1/admin/delete?purge_files=true

# Emergency: reduce retention and restart
# Edit loki-config.yaml: retention_period: 168h  (7 days)
docker compose -f docker-compose.observability.yaml restart loki
```

---

## Backup — Glitchtip Postgres

Nightly backup to R2 (`wappy-backups-prod`) is planned for Sprint 0 CI/cron task. Manual backup:

```bash
docker exec wappy-glitchtip-db pg_dump -U glitchtip glitchtip | gzip > glitchtip-$(date +%Y%m%d).sql.gz
```

---

## Upgrade a service

```bash
# Pull latest images
docker compose -f docker-compose.observability.yaml pull

# Recreate only the changed service (e.g., Grafana)
docker compose -f docker-compose.observability.yaml up -d --no-deps grafana
```

**Blast radius**: single service restart, ~10s downtime per service. No data loss (named volumes).

---

## Cross-service health matrix (Uptime Kuma recommended monitors)

| Check                              | Expected    |
|------------------------------------|-------------|
| http://localhost:3001/api/health   | 200 JSON ok |
| http://localhost:3100/ready        | 200 "ready" |
| http://localhost:9090/-/ready      | 200         |
| http://localhost:3200/ready        | 200 "ready" |
| http://localhost:9000/_health/     | 200 "ok"    |

Configure these monitors in Uptime Kuma at first boot.
