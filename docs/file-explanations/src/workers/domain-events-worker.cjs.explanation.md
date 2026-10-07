# Senior Engineering Explanation: `src/workers/domain-events-worker.cjs`

**Role:** the outbox consumer, run with `npm run worker:events` (once) or
`npm run worker:events -- --loop`.

## Walkthrough

- `:3` its own `PrismaClient` (CommonJS, outside Next.js).
- `processEvent` (`:5-15`): writes an `IntegrationLog` row with status `SUCCESS`. That is the
  entire "integration".
- `runOnce` (`:17-64`): selects up to 50 `PENDING` events with `availableAt <= now`, oldest first;
  for each, sets `PROCESSING` and increments `attempts`, calls `processEvent`, then sets
  `PROCESSED`. On error it sets `FAILED`, or `DEAD_LETTER` when `attempts + 1 >= 10`.
- `main` (`:66-82`): one pass, or an endless loop that sleeps 2 seconds when a pass found nothing.

## Review notes

- Only `PENDING` is selected (`:20`), so `FAILED` rows are never retried and `DEAD_LETTER` is
  unreachable in practice.
- No claim step: two workers can select the same rows and both process them. Use
  `FOR UPDATE SKIP LOCKED` via raw SQL, or a conditional `updateMany` that checks the old status.
- A crash after `:33-39` leaves the event in `PROCESSING` forever.
- `processEvent` has no per-type dispatch. Adding real handlers means a `switch` on
  `event.eventType` with idempotent handlers, since delivery is at-least-once.

## Check

**Goal:** see the retry gap. **Check:** make `processEvent` throw, run the worker twice, and
`SELECT status, attempts FROM "DomainEvent"` shows `FAILED` with `attempts = 1` after both runs.
