# Senior Engineering Explanation: `src/lib/db.js`

**Role:** exports the single `PrismaClient` instance (`db`) every service imports.

## Walkthrough

- `:3` uses `globalThis` as a cache.
- `:5-9` reuses `globalThis.db` if present, otherwise creates a client. In development it logs
  every query, error and warning; otherwise only errors (`:8`).
- `:11-13` outside production, stores the client on `globalThis`. Next.js dev mode re-evaluates
  modules on hot reload; without this, every reload would open a new connection pool.

## Review notes

- Development query logging is verbose: the payroll calculation issues several queries per
  employee (`src/services/payroll.service.js:301-421`), which floods the terminal.
- The worker (`src/workers/domain-events-worker.cjs:3`) and the seed (`prisma/seed.js:4`) create
  their own clients because they are CommonJS scripts run outside Next.js.

## Check

**Goal:** see the dev logging. **Check:** with `NODE_ENV=development` (the default for
`npm run dev`), loading `/employees` prints `prisma:query SELECT ...` lines in the terminal.
