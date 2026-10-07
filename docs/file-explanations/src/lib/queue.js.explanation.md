# Senior Engineering Explanation: `src/lib/queue.js`

**Role:** a thin BullMQ wrapper with a "no Redis" fallback.

## Walkthrough

- `getConnection` (`:7-20`): returns `null` when `REDIS_URL` is unset; otherwise one shared
  `IORedis` connection with `maxRetriesPerRequest: null` (required by BullMQ workers).
- `getQueue` (`:22-36`): one `Queue` per name, cached in a `Map`.
- `enqueue` (`:38-55`): without Redis it returns `{ queued: false, mode: "inline", ... }` and
  does nothing else; with Redis it adds a job and returns its id.
- `createWorker` (`:57-64`): would create a BullMQ `Worker`. Nothing calls it.

## Review notes

- "Inline mode" does not run the job inline. It silently drops it.
- The fallback is chosen by whether `REDIS_URL` is set, not whether Redis is reachable. With the
  variable set and Redis down, `queue.add` waits on the connection (`maxRetriesPerRequest: null`
  means "retry forever"), so `createNotification` and every request that calls it can stall.
- The only producer is `createNotification` (`src/services/notification.service.js:24-27`) and
  there is no consumer, so with Redis configured the `notification.dispatch` queue only grows.

## Check

**Goal:** prove there is no consumer. **Check:** with `REDIS_URL` set, create an employee, then
`redis-cli LLEN bull:notification.dispatch:wait` (or `KEYS bull:notification.dispatch:*`) shows
jobs that are never completed.
