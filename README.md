# Velocity Grid

An employer-of-record (EOR) platform MVP: a multi-tenant Next.js 16 App Router app (plain
JavaScript, React 19) on PostgreSQL through Prisma 6. It covers employees, contractors, contracts,
payroll, leave, billing, notifications and reporting for many client organizations in one database.

This README is the onboarding entry point. It describes what the code in this repository actually
does, including where it falls short of what the module list promises. The in-depth review lives in
[`fable/`](fable/README.md); the layer-by-layer tour is [`docs/architecture.md`](docs/architecture.md).

## What is implemented (and how far)

| Module | Where | State in code |
|---|---|---|
| Auth: register, login, logout, session | `src/services/auth.service.js`, `src/lib/auth.js` | Works. HS256 JWT in an httpOnly `vg_session` cookie, 8h (`src/lib/auth.js:6-7`). 5-strike lockout (`auth.service.js:150-151`). `UserStatus` is never checked. |
| RBAC + tenant isolation | `src/lib/permissions.js`, `src/services/rbac.service.js`, `src/services/context.js` | Enforced on API routes through `withRoute` (`src/lib/api.js:16`). Server-rendered pages do **not** check permissions (see "Known gaps"). |
| Employees + onboarding checklist + compensation | `src/services/employee.service.js` | Works; CSV import and form autofill included. |
| Contractors + convert to employee | `src/services/contractor.service.js` | Works; conversion has no status guard. |
| Contract templates + merge-tag render + send/sign | `src/services/contract.service.js` | Works; signing is not tied to the counterparty. |
| Payroll: create, calculate, approve, process, PDF payslips | `src/services/payroll.service.js` | Works on the happy path; no state-machine guards; float tax math. |
| Leave policies, requests, approvals, balances | `src/services/leave.service.js` | Request/decide works; **no accrual code exists**, so balances start at 0. |
| Billing plans + monthly invoice | `src/services/billing.service.js` | Invoice row is computed and stored; nothing is charged (`stripe` is a dependency with no import). |
| Notifications, audit log, outbox | `src/services/notification.service.js`, `src/lib/audit.js`, `src/lib/events.js`, `src/workers/domain-events-worker.cjs` | In-app notifications work. The outbox worker only writes an `IntegrationLog` row; no email or webhook is sent. |
| Admin: tax rules, templates, organizations | `src/app/(app)/admin/page.js`, `src/components/panels/admin-panel.js` | Renders for a client admin; throws for the platform admin (see "Known gaps"). |

About half of the 1,097-line `prisma/schema.prisma` (benefits, time entries, terminations,
compliance documents, invitations, idempotency keys, webhooks) has no code that reads or writes it.

## Tech stack (from `package.json`)

- `next` 16.1.6, `react`/`react-dom` 19.2.3, JavaScript with the `@/*` path alias (`jsconfig.json`)
- `@prisma/client` + `prisma` ^6.16.3, PostgreSQL (`prisma/schema.prisma:5-8`)
- `zod` ^4 for request bodies, `jose` for JWTs, `bcryptjs` (cost 12) for passwords
- `pdfkit` for payslips, `date-fns` for leave/billing date math
- `bullmq` + `ioredis` (optional; see `src/lib/queue.js`)
- Tailwind CSS 4 via `@tailwindcss/postcss`
- Declared but never imported anywhere in `src/`: `stripe`, `nodemailer`, `clsx`

## Running it locally

There is no `.env.example` in this repository, even though `.gitignore` whitelists one. Create
`.env` yourself. These are every environment variable the code reads:

| Variable | Read at | If missing |
|---|---|---|
| `DATABASE_URL` | `prisma/schema.prisma:7` | Prisma cannot connect. With the compose file: `postgresql://postgres:postgres@localhost:5432/velocity_grid` (`docker-compose.yml:7-11`). |
| `AUTH_SECRET` | `src/lib/auth.js:10` | Silently falls back to the public string `dev_only_replace_me_32_characters_min`, so anyone can forge sessions. Always set it. |
| `FIELD_ENCRYPTION_KEY` | `src/lib/crypto.js:3` | `encryptField` returns plaintext. It is also never called, so today nothing is encrypted either way. |
| `REDIS_URL` | `src/lib/queue.js:8` | `enqueue` returns `{ queued: false, mode: "inline" }` and does nothing else. |
| `NODE_ENV` | `src/lib/db.js:8`, `src/lib/auth.js:52` | Controls Prisma query logging and the cookie `secure` flag. |

Then, in order:

1. `npm install`
2. `docker compose up -d` starts Postgres 16 on 5432 and Redis 7 on 6379 (`docker-compose.yml`).
3. `npm run db:push` syncs the schema. There is no `prisma/migrations/` folder, so `db:migrate`
   would create the first migration rather than replay history.
4. `npm run db:seed` runs `prisma/seed.js`. **Read the warning below first.**
5. `npm run dev` and open `http://localhost:3000`.
6. Optional: `npm run worker:events` drains the outbox once, and `npm run worker:events -- --loop`
   keeps polling every 2 seconds when the queue is empty (`src/workers/domain-events-worker.cjs:66-82`).

### Seed warning

`prisma/seed.js:157-158` calls `prisma.organization.upsert({ where: { billingEmail: ... } })`, but
`billingEmail` is a plain `String` on `Organization` (`prisma/schema.prisma:261`), not `@unique`.
Prisma's `upsert` requires a unique field in `where`, so by reading the code the seed should fail
there, after the permissions and the `PLATFORM_ADMIN` role are created but before any user
exists. If that happens, the seed accounts below do not exist; use `/signup` to create a tenant
and its first `CLIENT_ADMIN` instead. Fixing it means either adding `@unique` to `billingEmail`
or replacing the upsert with `findFirst` + `create`, as the seed already does for employees.

Seed accounts (when the seed completes), all with password `ChangeMe!123` (`prisma/seed.js:180`):

- Platform admin: `platform.admin@example.com`
- Client admin for "Acme Global": `client.admin@acme-global.example`

The seed also creates one employee (Alex Worker, US) with a current compensation of
`12000000` minor units, MONTHLY (`prisma/seed.js:251-253`). The payroll engine pays
`amountMinor` once per run regardless of `payFrequency`, so that is $120,000 per run.

## npm scripts

| Script | Runs |
|---|---|
| `dev` / `build` / `start` | `next dev` / `next build` / `next start` |
| `lint` | `eslint` with `eslint-config-next/core-web-vitals` (`eslint.config.mjs`) |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:push` | `prisma db push` |
| `db:seed` | `node prisma/seed.js` |
| `db:reset` | `prisma migrate reset --force` |
| `worker:events` | `node src/workers/domain-events-worker.cjs` |

There is no `test` script and no test files.

## Employee CSV import

On `/employees` (`src/components/panels/employees-panel.js`):

- **Download CSV Template** builds the file client-side from `buildEmployeeCsvTemplate()`
  (`src/lib/csv.js:228-230`).
- **Autofill Form** parses the file in the browser and copies the first row into the form
  (`employees-panel.js:216-236`).
- **Import CSV Rows** uploads the file to `POST /api/employees/import-csv`, which parses it on the
  server and creates employees one row at a time, returning a per-row result
  (`src/services/employee.service.js:417-483`). The limit is 500 rows (`employee.service.js:418`).

Header names are matched loosely: `First Name`, `first_name` and `firstname` all map to
`firstName` (`src/lib/csv.js:68-72`, `101-113`). Note that the template row ships `85000` with
`MONTHLY` (`src/lib/csv.js:223-225`), which payroll would pay as 85,000 per run.

## Reading order for a new engineer

1. `src/lib/api.js` (61 lines): the `withRoute` wrapper every API route goes through.
2. `src/lib/auth.js` and `src/services/context.js`: who the user is and which tenant they may touch.
3. `src/app/api/employees/route.js` then `src/services/employee.service.js:118-184`: one full write
   path with audit log and outbox event in a single transaction.
4. `src/services/payroll.service.js`: the most complex domain logic.
5. `src/app/(app)/payroll/page.js` + `src/components/panels/payroll-panel.js`: how a page reads data
   on the server and writes through the API.
6. `fable/02-bugs-and-security.md`: what is wrong, with file:line references.

## Known gaps worth knowing before you change anything

- **Pages skip permission checks.** Every page under `src/app/(app)/` calls `requirePageUser()`
  and then a service directly (for example `src/app/(app)/payroll/page.js:6-7`). Permission checks
  only exist in `withRoute`, so an `EMPLOYEE` user can open `/payroll`, `/reports` or `/admin` and
  see data their role cannot fetch through the API.
- **Pages throw for the platform admin.** `resolveOrganizationId` demands an explicit organization
  id for `PLATFORM_ADMIN` (`src/services/context.js:19-24`), and the pages pass none. Only
  `/dashboard` and `/notifications` avoid that call.
- **Any tenant admin can edit global tax rules.** `TaxRule` has no `organizationId`
  (`prisma/schema.prisma:655-671`), `CLIENT_ADMIN` holds `tax_rules.manage`
  (`src/lib/permissions.js:57`), and `/signup` gives every new tenant a `CLIENT_ADMIN`.
- **No tests, no migrations, no CI.**

Full list with fixes: [`fable/02-bugs-and-security.md`](fable/02-bugs-and-security.md).

## Documentation map

- [`docs/architecture.md`](docs/architecture.md): layers, request lifecycle, tenancy, RBAC, payroll, events.
- [`docs/improved-implementation-plan.md`](docs/improved-implementation-plan.md): the author's plan, annotated with what shipped.
- [`docs/automation-opportunities.md`](docs/automation-opportunities.md): automation ideas and what each one depends on.
- [`docs/file-explanations/INDEX.md`](docs/file-explanations/INDEX.md): one companion note per tracked file.
- [`fable/`](fable/README.md): code review and junior-to-senior training track.
