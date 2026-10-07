# Senior Engineering Explanation: `src/lib/events.js`

**Role:** `publishDomainEvent(tx, event)` writes a `DomainEvent` row (the transactional outbox)
using the caller's transaction client.

## Walkthrough

- `:2-9` takes tenant, event type, aggregate type and id, payload, and an optional `availableAt`.
- `:11-20` inserts the row; `status` defaults to `PENDING` and `availableAt` to now
  (`prisma/schema.prisma:1072-1074`).

## Review notes

- 10 call sites in the employee, contract, leave and payroll services. Contractor, billing,
  organization and tax changes emit no events.
- The pattern is right: the event exists if and only if the business write committed. The
  consumer is the weak half (`src/workers/domain-events-worker.cjs`), which never retries
  `FAILED` rows.
- `availableAt` is never passed by any caller, so delayed delivery is supported but unused.

## Check

**Goal:** prove atomicity. **Check:** make `createEmployee` throw right after
`publishDomainEvent` (temporarily); no `Employee` and no `DomainEvent` row is left behind.
