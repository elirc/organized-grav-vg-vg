# Architecture Guide

A tour of how Velocity Grid is put together, with file:line references you can open alongside it.
Where the original version of this guide described intent that the code does not carry out, the
text now says what the code does and keeps the intent as a note.

## Stack

- Runtime: Node.js, Next.js 16.1.6 App Router, React 19.2.3, plain JavaScript (`package.json`)
- Database: PostgreSQL through Prisma 6 (`prisma/schema.prisma`, 1,097 lines)
- Validation: Zod 4 schemas in `src/lib/validators.js`
- Auth: HS256 JWT signed with `jose`, stored in an httpOnly cookie (`src/lib/auth.js`)
- Jobs: an optional BullMQ queue (`src/lib/queue.js`) and a polling outbox worker
  (`src/workers/domain-events-worker.cjs`)

## Codebase layout

```
prisma/schema.prisma      data model: 39 models + enums, tenant key = organizationId
prisma/seed.js            permissions, roles, demo tenant, demo employee, plan, one US tax rule
src/lib/                  infrastructure: db, auth, api wrapper, errors, money, crypto, csv,
                          queue, audit, events, permissions, validators, request-meta, page-auth
src/services/             domain logic, one file per area, plus context.js (tenant resolution)
src/app/api/**/route.js   42 route files, 54 exported handlers; all but import-csv use withRoute
src/app/(app)/**/page.js  authenticated server pages that call services directly
src/components/panels/    client components that render data and POST to the API
src/workers/              the outbox drainer (CommonJS, run with plain node)
```

Services in `src/services/`: `auth`, `org`, `employee`, `contract`, `payroll`, `leave`,
`contractor`, `billing`, `report`, `dashboard`, `tax`, `notification`, `rbac`, and `context.js`.

## Two request paths

There are two ways data moves, and they enforce different things.

```
Write path:  client panel --fetch--> src/app/api/**/route.js --withRoute--> service --> Prisma
Read path:   src/app/(app)/*/page.js --requirePageUser()--> service --> Prisma --> props to panel
```

### The write path, step by step (`POST /api/employees`)

1. `src/app/api/employees/route.js:10-17` exports `POST = withRoute({ permission:
   "employees.create", bodySchema: employeeCreateSchema }, handler)`.
2. `withRoute` (`src/lib/api.js:16-60`):
   - `:19-24` reads the `vg_session` cookie via `getRequestUser` unless `auth: false`, and throws
     401 when there is no user.
   - `:26-28` calls `requirePermission`, which throws 403 unless the user's permission list
     contains the name or `"*"` (`src/lib/auth.js:156-168`).
   - `:30-42` parses JSON and runs `bodySchema.safeParse`; failure is a 400 with
     `parsed.error.flatten()` as `details`.
   - `:44-50` calls the handler with `{ request, params, query, user, body }`.
   - `:52-56` returns a `Response` unchanged or wraps anything else as `{ ok: true, data }`.
   - `:57-59` hands every throw to `toErrorResponse` (`src/lib/errors.js:16-41`): an `AppError`
     becomes its own status, anything else is logged and becomes a generic 500.
3. `getRequestUser` (`src/lib/auth.js:132-140`) verifies the JWT, then reloads the user with
   roles and permissions from the database on every request (`loadUserContext`, `:14-34`).
   The token carries only `sub` and `org`, so role changes apply on the next request.
4. `createEmployee` (`src/services/employee.service.js:118-184`) resolves the tenant (`:119`), then
   inside one `db.$transaction` creates the employee, its onboarding checklist, an optional
   compensation row, an `AuditLog` row and a `DomainEvent` row (`:121-183`).
5. Back in the route, `inviteEmployeeNotification` (`employee.service.js:389-415`) notifies the
   tenant's client admins outside the transaction.

### The read path (`/payroll`)

1. `src/app/(app)/layout.js:5` calls `requirePageUser()`, which redirects to `/login` when
   there is no session (`src/lib/page-auth.js:4-12`).
2. `src/app/(app)/payroll/page.js:6-7` calls `listPayrollRuns(user)` directly.
3. The rows are passed as props to the client `PayrollPanel`.

**What differs:** the read path checks authentication and tenant, but never a permission. The
permission check exists only in `withRoute`. An `EMPLOYEE` (whose permissions are
`leave.request`, `notifications.view`, `contracts.view`, `src/lib/permissions.js:68-72`) can open
`/payroll`, `/reports`, `/employees` and `/admin` and receive data that `GET /api/payroll`
would refuse with 403.

**Check:** log in as a user whose only role is `EMPLOYEE`, call `GET /api/payroll` (expect 403
`Missing permission: payroll.view`), then load `/payroll` in the browser. The page renders the
tenant's runs.

## Multi-tenancy

- The tenant key is `organizationId` on tenant-owned tables (`Employee`, `Contract`,
  `PayrollRun`, `LeaveRequest`, ...). Child rows such as `PayrollItem`, `Compensation` and
  `OnboardingChecklist` are scoped through their parent.
- `resolveOrganizationId(user, explicitId)` (`src/services/context.js:18-36`):
  - platform admin: returns `explicitId`, or throws 400 if none was given (`:19-24`);
  - anyone else: throws 400 without an organization, 403 if `explicitId` names another tenant,
    and otherwise returns the user's own organization (`:27-35`).
- `requireOrganizationAccess` (`context.js:8-16`) is used only by `org.service.js`.

The usual pattern is "load by id, then check": for example `getPayrollRun` does `findUnique({
where: { id } })` and then `resolveOrganizationId(user, run.organizationId)`
(`src/services/payroll.service.js:182-196`). That guards the row named in the URL. It does not
guard other ids in the body: `createContract` loads `payload.employeeId` and
`payload.templateId` without any tenant filter (`src/services/contract.service.js:30-33`,
`154-160`), and `createLeaveRequest` does the same for `payload.policyId`
(`src/services/leave.service.js:130-134`).

Some data is global on purpose: `TaxRule` (`prisma/schema.prisma:655-671`) and `PricingPlan`
(`:875-888`) have no `organizationId`. Templates and leave policies with `organizationId = null`
are shared and are listed alongside tenant rows (`contract.service.js:52-57`,
`leave.service.js:19-25`).

**Platform admin and pages.** Because the pages pass no organization id, every page that calls a
tenant-scoped list throws the 400 from `context.js:24` for the platform admin. Only
`/dashboard` (which branches early, `src/services/dashboard.service.js:6-12`) and
`/notifications` render for that account.

## RBAC

- Tables: `Role`, `Permission`, `RolePermission`, `UserRole` (`prisma/schema.prisma:342-392`).
- Permission names are `resource.action` strings listed in `src/lib/permissions.js:1-29`; the
  default grants per role are in `:31-74`.
- `PLATFORM_ADMIN` is never given rows; `normalizeUserContext` adds `"*"` when it sees that role
  name (`src/lib/auth.js:109-112`).
- `ensureBaseRbac` (`src/services/rbac.service.js:69-113`) creates the global `PLATFORM_ADMIN`
  role and the four per-tenant roles when an organization is created.
- The same permission and grant lists are copied by hand into `prisma/seed.js:6-68`. Change one
  and you must change the other.

Note that `CLIENT_ADMIN` holds `tax_rules.manage` (`permissions.js:57`) while tax rules are
global. A self-registered tenant admin can therefore create or edit the rules every tenant's
payroll uses (`src/app/api/tax-rules/route.js:9-14`, `src/services/tax.service.js:21-48`).

## Payroll engine

All in `src/services/payroll.service.js`. Statuses are `PayrollRunStatus` and
`PayrollItemStatus` (`prisma/schema.prisma:88-104`).

1. **Create** (`:222-252`): one `DRAFT` run per organization and period; the
   `@@unique([organizationId, periodStart, periodEnd])` constraint (`schema.prisma:612`) rejects a
   duplicate period, which surfaces as a generic 500 because the Prisma error is not mapped.
2. **Calculate** (`:254-523`):
   - loads `ACTIVE`, `ONBOARDING` and `ON_LEAVE` employees (`:265-279`) and every active tax rule
     in force for the period (`:281-289`);
   - in one transaction, marks the run `CALCULATING`, then per employee loads the current
     compensation (`:303`, through `db`, not `tx`), uses `amountMinor` as gross pay with
     overtime/bonus/commission/allowances hard-coded to 0 (`:340-346`), loads year-to-date
     totals (`:350`), applies every rule whose `countryCode` equals `employmentCountry` exactly
     (`:352-368`), and upserts a `PayrollItem` (`:373-421`);
   - an employee with no current compensation gets a `FAILED` item (`:305-337`);
   - finally sets the run to `PENDING_APPROVAL` with totals, writes audit + outbox
     (`:460-493`), and notifies client admins after the transaction (`:496-520`).
3. **Approve** (`:525-568`): sets the run `APPROVED` and its `CALCULATED` items `APPROVED`.
   It does not check the current status.
4. **Process** (`:570-655`): inside one transaction, sets `PROCESSING`, writes one PDF per
   `APPROVED` item to `storage/payslips/<itemId>.pdf` (`:130-167`), marks items `PAID`, then the
   run `COMPLETED`. It also does not check the current status.

Tax math converts minor units to floating-point "major" units, computes, and rounds back
(`:16-18`, `:46-84`). `computeTaxForRule` supports `PROGRESSIVE_BRACKET`, `FLAT_RATE`,
`FLAT_AMOUNT` and `WAGE_BASE_CAP`; an unknown type yields 0 tax.

**Check:** with the seed data, call `computeTaxForRule({ calculationType: "FLAT_RATE", paidBy:
"EMPLOYEE", brackets: [{ rate: 0.2 }] }, 12000000n, 0n)` in a scratch test. Expect
`employeeAmountMinor === 2400000n` and `employerAmountMinor === 0n`.

## Contracts and templates

- `ContractTemplate` rows are versioned per `(organizationId, name)`; a new template with an
  existing name gets `version = latest + 1` (`src/services/contract.service.js:60-100`).
- `renderMergeFields` (`:8-28`) replaces `{{ path.to.value }}` tokens by walking a context object
  built from the employee, the full contractor row, the organization, and payload extras
  (`:162-177`). Unknown paths render as an empty string.
- Lifecycle: `createContract` writes `DRAFT` (`:142-224`), `sendContractForSignature` sets `SENT`
  and notifies the employee's linked user (`:258-316`), `signContract` sets `SIGNED`, stores the
  signature with IP and user agent, and flips to `ACTIVE` when the effective date has passed
  (`:318-380`). None of these check the previous status. `previousVersionId` is stored for
  amendments, but no code builds amendment chains.
- `PATCH /api/contracts/[id]` accepts `status` and `renderedContent` directly
  (`src/lib/validators.js:112-116`), so a contract can be set to `SIGNED` without a signature.

## Leave

- `LeavePolicy`, `LeaveBalance` (unique per employee + policy, `schema.prisma:781`) and
  `LeaveRequest` (`schema.prisma:743-809`).
- `createLeaveRequest` (`src/services/leave.service.js:117-218`) computes calendar days unless
  the caller supplies `totalDays` (`:140`), creates a zero balance on first use (`:150-161`),
  rejects when `balance - pending - used` is short (`:163-167`), and adds to `pendingDays` by
  read-then-write (`:185-192`).
- `decideLeaveRequest` (`:220-322`) requires `PENDING` (`:233-235`) and moves days from pending
  to used on approve.
- There is no accrual job: nothing in `src/` writes `balanceDays`, so every balance stays at 0 and
  every request is refused until someone writes balances by hand.
- The original guide said decisions "adjust pending/used days atomically". The writes are inside
  one transaction, but the values are read first and written back as absolutes, and the
  `PENDING` check happens before the transaction starts. Two concurrent decisions on the same
  request can both pass.

## Billing

- `PricingPlan` is global; `ClientInvoice` is per tenant (`schema.prisma:875-913`).
- `generateMonthlyInvoice` (`src/services/billing.service.js:33-114`) bills the previous calendar
  month: the plan base fee, per-employee fee times the **current** count of `ACTIVE` and
  `ON_LEAVE` employees, and a "payroll service fee" equal to 1% of each run's employer cost
  (integer division by 100 at `:64-67`), for runs of any status.
- The plan used is simply the first active plan in the table (`:58`); organizations have no plan
  link. The invoice is created already `SENT` (`:82`), and there is no uniqueness on period, so
  every click creates another one.

## Events and worker

- Services write `DomainEvent` rows with `publishDomainEvent(tx, ...)` inside their transactions
  (`src/lib/events.js:1-21`; 10 call sites).
- The worker (`src/workers/domain-events-worker.cjs`) selects up to 50 `PENDING` events whose
  `availableAt` has passed (`:17-29`), marks each `PROCESSING`, writes an `IntegrationLog` row with
  status `SUCCESS` (`:5-15`), then marks it `PROCESSED`.
- On error it sets `FAILED`, or `DEAD_LETTER` after 10 attempts (`:51-59`). Because the query only
  selects `PENDING`, a `FAILED` event is never picked up again, so the 10-attempt path cannot be
  reached. The original guide's "retry states" are not implemented.
- Two worker processes would process the same event: the select does not lock or claim rows.
- Separately, `createNotification` enqueues `notification.dispatch` to BullMQ when `REDIS_URL` is
  set (`src/services/notification.service.js:24-27`). No code calls `createWorker`, so nothing
  consumes that queue.

**Check:** create an employee, then run `npm run worker:events`. Expect the console line
`Processed 1 events.` (or more), one new `IntegrationLog` row with `event = 'employee.created'`,
and the matching `DomainEvent` row in status `PROCESSED`.

## Local runbook

See the README for the full list of environment variables (there is no `.env.example`).

1. `docker compose up -d`
2. `npm run db:push`
3. `npm run db:seed` (read the seed warning in the README first)
4. `npm run dev`
5. Optional: `npm run worker:events -- --loop`

## Exercises

1. **Goal:** see the difference between the two request paths. **Check:** a single sentence
   naming the file and line where `/api/employees` enforces `employees.view` and the file where
   `/employees` does not.
2. **Goal:** trace one tenant boundary. Pick `getContract` and `createContract`. **Check:** you
   can name which ids each one validates against the caller's tenant and which it does not,
   with line numbers.
3. **Goal:** understand the outbox drain. **Check:** after creating one employee and one contract,
   `SELECT status, count(*) FROM "DomainEvent" GROUP BY status` before and after one worker run
   shows those events moving from `PENDING` to `PROCESSED`.
