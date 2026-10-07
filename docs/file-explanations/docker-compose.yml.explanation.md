# Senior Engineering Explanation: `docker-compose.yml`

**Role:** local infrastructure only; the app itself runs on the host with `npm run dev`.

## Walkthrough

- `postgres` (`:2-13`): `postgres:16`, user and password `postgres`, database `velocity_grid`,
  port 5432, named volume `postgres_data`.
- `redis` (`:15-22`): `redis:7`, port 6379, named volume `redis_data`.

## Notes

- Ports 5432 and 6379 collide with any natively installed Postgres or Redis.
- Starting Redis does nothing for the app unless `REDIS_URL` is set, and even then nothing
  consumes the queue (`src/lib/queue.js`).
- No health checks, so `docker compose up -d && npm run db:push` can race the database start.

## Check

**Check:** `docker compose ps` shows `vg-postgres` and `vg-redis` running, and
`psql postgresql://postgres:postgres@localhost:5432/velocity_grid -c "select 1"` succeeds.
