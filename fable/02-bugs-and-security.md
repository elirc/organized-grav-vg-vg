# 02 — Bugs, Security & Data Integrity

Ordered by severity. The unifying theme: the right controls exist (`resolveOrganizationId`, permissions, `BigInt` storage) but hold on *some* paths, not all. A control that holds 8 of 10 paths gives the security of 0 — an attacker only needs the 2.

Each item: **where → why it breaks → fix → the general rule.** Items are derived from reading the code; none of this was executed for this write-up. Where a conclusion depends on framework behavior rather than on this repository's code alone, the item says so and gives a **Check** that settles it.

---

<a id="a0"></a>
## A0 · Server pages skip permission checks

Every authenticated page calls `requirePageUser()` and then a service directly — e.g. `src/app/(app)/payroll/page.js:6-7`, `reports/page.js:5-10`, `admin/page.js:8-13`, `employees/page.js:6-7`. `requirePageUser` (`src/lib/page-auth.js:4-12`) only checks that a session exists. Permissions are enforced in exactly one place, `withRoute` (`src/lib/api.js:26-28`), which pages never pass through.

An `EMPLOYEE` holds `leave.request`, `notifications.view`, `contracts.view` (`src/lib/permissions.js:68-72`). That user is refused by `GET /api/payroll` but can open `/payroll` (all runs with totals), `/reports` (payroll totals for the last 24 runs), `/employees` (every employee with current compensation, `employee.service.js:66-71`) and `/admin` (tax rules, templates, organizations). The service calls stay tenant-scoped, so this is within one tenant — but it is exactly the data the role model exists to hide.

**Fix:** a `requirePagePermission(permission)` helper that every page calls, or push permission checks into the services so both paths share them.
**Rule:** if two entry points reach the same data, the check belongs below both of them.
**Check:** as an `EMPLOYEE`-only user, `GET /api/payroll` returns 403 `Missing permission: payroll.view` while `/payroll` renders.

---

<a id="a7"></a>
## A7 · Any tenant can rewrite every tenant's tax rules

`TaxRule` has no `organizationId` (`prisma/schema.prisma:655-671`). `createTaxRule`/`updateTaxRule` (`src/services/tax.service.js:21-48`) apply no scoping and write no audit log. The routes require `tax_rules.manage` (`src/app/api/tax-rules/route.js:9-14`, `[id]/route.js:5-10`) — and `CLIENT_ADMIN` holds it (`src/lib/permissions.js:57`). `/api/auth/register` is public and makes the registrant a `CLIENT_ADMIN` of a new `ACTIVE` organization (`src/services/auth.service.js:44-72`).

So anyone on the internet can sign up and then set, say, the US income-tax rate for every tenant: `calculatePayrollRun` loads all active rules regardless of tenant (`payroll.service.js:281-289`).

**Fix:** remove `tax_rules.manage` from `CLIENT_ADMIN` (keep it platform-only), audit-log rule changes, or add `organizationId` for tenant-specific overrides.
**Rule:** global configuration needs a global-only permission. A permission name is not a scope.
**Check:** register a fresh tenant via `/signup`, `PATCH /api/tax-rules/<seeded US rule id>` with `{"brackets":[{"rate":0.9}]}`; expect 200. Then calculate a payroll run in the seeded tenant and see 90% tax.

---

<a id="a1"></a>
## A1 · Payroll returns 500 on success

`calculatePayrollRun` (`payroll.service.js:522`), `approvePayrollRun` (`:534-567`) and `processPayrollRun` (`:579-654`) return Prisma rows with `BigInt` fields (`totalGrossMinor` etc., `schema.prisma:596-598`). `withRoute` wraps them with `NextResponse.json(...)` (`api.js:56`), and **`JSON.stringify` throws on BigInt** (`TypeError: Do not know how to serialize a BigInt`). No `BigInt.prototype.toJSON` is defined anywhere in `src/`. The throw is inside `withRoute`'s `try`, so it becomes a generic **500** — *after* the transaction has committed. Same for `GET /api/payroll` and `/api/dashboard` once any run has been calculated (a `DRAFT` run's totals are `null`, which serializes fine, so `POST /api/payroll` itself is unaffected), `GET /api/billing/invoices`, `POST /api/billing/invoices/generate`, `GET /api/employees` (compensations carry `amountMinor`) and `POST /api/employees/[id]/compensation`.

The tell: the *same rows* cross the RSC boundary fine (React's Flight serializer supports BigInt); only the JSON path breaks. One value, two serializers, different capabilities.

**Fix:** convert BigInt at the `withRoute` boundary (`JSON.stringify(result, (_,v)=>typeof v==="bigint"?v.toString():v)`), or return DTOs so BigInt never leaves the service.
**Rule:** decide *once* where DB types become wire types.
**Check:** click Calculate on a `DRAFT` run; the panel shows "Internal server error", the terminal logs `Unhandled API error` with the BigInt `TypeError`, and after a refresh the run shows `PENDING_APPROVAL`.

---

<a id="a2"></a>
## A2 · Payslip download: IDOR (+ path built from input)

`app/api/documents/payslips/[id]/route.js:5-18` builds `storage/payslips/${params.id}.pdf` from the URL and streams it, gated only on `payroll.view`.

- **IDOR:** any user with `payroll.view` in *any* org reads *any* org's payslip by knowing a `PayrollItem` id. Those ids are returned by `/api/payroll/[id]/items` and embedded in each item's `payslipUrl` (`payroll.service.js:166`). The permission checks "can view payroll," never "can view *this* payroll."
- **Path from input:** the raw id goes into `path.join`. Because `.pdf` is appended, the reachable files are limited to other `.pdf` files, but the pattern is wrong regardless.

**Fix:** look up the item with its run, `resolveOrganizationId(user, item.payrollRun.organizationId)`, and build the path from the **DB-derived** id.
**Rule:** never build a filesystem path from request input; an ID in a URL is not authorization (OWASP API1, Broken Object Level Authorization).

---

<a id="a3"></a>
## A3 · Cross-tenant IDs are trusted

`resolveOrganizationId` guards the *primary* entity but not related IDs in the payload:

- `createContract` loads `payload.templateId` (`contract.service.js:31-33`), `payload.employeeId` and `payload.contractorId` (`:154-160`) with bare `findUnique` — no org filter — and renders that (possibly other-org) employee's name/title, or the **entire** contractor row, into the contract (`:162-179`). Cross-tenant exfiltration through a template like `{{contractor.email}}`.
- `createLeaveRequest` (`leave.service.js:130-134`) trusts `payload.policyId`; you can attach your employee to another org's policy.
- `createEmployee` (`employee.service.js:133`) and `updateEmployee` (`:198-201`, schema `validators.js:61`) never validate `managerId` — any org, or a random cuid (the FK then fails as a 500).
- `listLeaveBalances` filters by the caller's org but accepts any `employeeId` (`leave.service.js:61-82`) — harmless only because the org filter is ANDed in.

**Fix:** re-fetch every caller-supplied id **scoped to the resolved org** (`findFirst({ where:{ id, organizationId }})`). Wrap it as `loadScoped(model, id, user)` so it can't be forgotten.
**Rule:** authorize *every* identifier the caller controls, not just the route's subject.

---

<a id="a4"></a>
## A4 · `UserStatus` is never enforced

Schema has `LOCKED`/`DISABLED` (`schema.prisma:17-22`), but `loginWithPassword` checks only `lockedUntil` (`auth.service.js:143-145`) and never `status`, and `normalizeUserContext` (`src/lib/auth.js:100-130`) never consults it. A disabled account keeps logging in, and an existing session keeps working for up to 8 hours.
**Fix:** reject non-`ACTIVE` at login and treat non-`ACTIVE` as unauthenticated in `getRequestUser`/`getServerUser`. **Rule:** a status enum nothing branches on is a latent security bug.

---

<a id="a5"></a>
## A5 · No state-machine guards

Rich status enums, almost no transition checks:

- `approvePayrollRun` (`payroll.service.js:525-568`) doesn't require `PENDING_APPROVAL` — approve a DRAFT, or re-approve a COMPLETED run.
- `processPayrollRun` (`:570-655`) doesn't require `APPROVED` and isn't idempotent — process twice → PDFs rewritten + duplicate "Payslip available" notifications (`:609-622`). Combined with A1 (false 500 → retry), double-processing is *likely*.
- `calculatePayrollRun` (`:254-523`) recalculates a `COMPLETED` run and sets it back to `PENDING_APPROVAL`; `PAID` items are overwritten to `CALCULATED`.
- `signContract` (`contract.service.js:318-380`) doesn't require `SENT` — sign a DRAFT, or re-sign a SIGNED contract, overwriting `signatureData`.
- `PATCH /api/contracts/[id]` accepts `status` (any value, including `SIGNED`) and `renderedContent` (`validators.js:112-116`) and writes them straight through (`contract.service.js:234-238`), so a signed contract's text can be changed afterwards.
- `convertContractorToEmployee` (`contractor.service.js:85-134`) doesn't check the contractor is still active — convert twice, get two employees.

**Fix:** guard every transition (`if (run.status !== "PENDING_APPROVAL") throw new AppError(409, ...)`); ideally one central `assertTransition(from,to)` map. `decideLeaveRequest` already does this (`leave.service.js:233-235`) — apply it everywhere.
**Rule:** a status column is a state machine; every write must assert the edge is legal.

---

<a id="a6"></a>
## A6 · Broken function-level authorization on signing

`contracts/[id]/sign/route.js:6-10` requires `contracts.view` (which `EMPLOYEE` and `CLIENT_MANAGER` both hold), and `signContract` never checks the signer *is* the counterparty. Any employee can sign anyone's contract in their tenant, recording their own IP as the signature. The UI's Sign button makes the admin do exactly this with a hard-coded `"typed-signature"` (`src/components/panels/contracts-panel.js:137-140`).
**Fix:** verify the signer matches the contract's employee/contractor user. **Rule:** permissions answer "what class of action"; object checks answer "on which object"; you need both.

---

<a id="a8"></a>
## A8 · Self-service tenant status and other mass-assignment

`updateOrganization` writes the validated body straight through (`org.service.js:77-80`), and `organizationUpdateSchema` (`validators.js:21-35`) includes `status`. A `CLIENT_ADMIN` holds `organizations.manage` (`permissions.js:56`), so a `SUSPENDED` tenant can set itself back to `ACTIVE`. The same "validated body → `data: payload`" pattern appears in `updateEmployee` (`employee.service.js:198-201`), `updateContractor` (`contractor.service.js:62-65`), `updateContract` and `updateTaxRule`; it is safe exactly as long as each Zod schema omits every privileged field.
**Rule:** enumerate writable fields per role, not per entity.

---

## Data-integrity defects

<a id="b1"></a>
**B1 · Money stored as int, computed as float.** The tax engine does `Number(minor)/100`, floats the math, rounds back (`payroll.service.js:16-18`, `:46-84`). Over many employees/brackets these errors accumulate and won't reconcile to the penny. `payrollSummaryReport` sums `Number(...)` of BigInts (`report.service.js:53-61`), which loses precision past 2^53. Fix: integer/decimal math end to end; round only at explicit, documented points.

<a id="b2"></a>
**B2 · Leave-balance race.** `createLeaveRequest` reads `pendingDays` into a JS float, adds, writes back (`leave.service.js:185-192`). Two concurrent requests both read the old value → one increment lost, and the "insufficient balance" check is bypassable. `decideLeaveRequest` checks `PENDING` *before* its transaction (`:221-235`) and writes absolutes, so two concurrent approvals both add to `usedDays`. **A `$transaction` gives atomicity of your writes, not protection from concurrent readers.** Fix: atomic `{ increment }`, a conditional `updateMany({ where: { id, status: "PENDING" } })` and check the count, or a `FOR UPDATE` read.

<a id="b3"></a>
**B3 · No idempotency, despite an `IdempotencyKey` table nobody uses.** `generateMonthlyInvoice` double-clicks into two invoices (`billing.service.js:73-113`; no unique constraint like payroll runs have, `schema.prisma:890-913`). Fix: wire the table or add `@@unique([organizationId, periodStart])`.

<a id="b4"></a>
**B4 · Validation checks fields, never relationships.** No `endDate >= startDate` anywhere (leave/payroll/contracts accept inverted ranges → negative day counts). `totalDays` is caller-supplied and trusted (`leave.service.js:140`). `employmentCountry` is free text (`validators.js:44`), so "US"/"USA"/"us" silently fails the exact-match tax lookup (`payroll.service.js:352`) → $0 tax, no error. (The CSV path upper-cases it, `csv.js:144`; the form path does not.)

<a id="b5"></a>
**B5 · Silent failure modes.** `toMinorUnits` returns `0` on NaN (`money.js:10-12`); `computeTaxForRule` returns 0 for an unknown `calculationType`; failed payroll items are swallowed and the run still reaches `PENDING_APPROVAL`; `decryptField` returns ciphertext on error (`crypto.js:63-65`). **Rule:** a wrong answer is worse than a crash — especially for money.

<a id="b6"></a>
**B6 · Pay frequency is ignored; the samples are annual salaries.** Payroll uses `compensation.amountMinor` as gross pay for every run (`payroll.service.js:340-346`) and never reads `payFrequency`. The seed stores `12000000` minor units MONTHLY (`prisma/seed.js:251-253`) and the CSV template ships `85000` MONTHLY (`src/lib/csv.js:223-225`) — values that read like annual salaries, paid per run. Fix: decide whether `amountMinor` is annual or per-period, name the column accordingly, and divide by periods-per-year in the engine.

<a id="b7"></a>
**B7 · The seed cannot complete as written.** `prisma/seed.js:157-158` calls `organization.upsert({ where: { billingEmail } })`, but `billingEmail` is not unique (`schema.prisma:261`); Prisma's `upsert` requires a unique selector. The run should stop after permissions and the platform role exist, before any user is created. Fix: `@unique` on `billingEmail`, or `findFirst` + `create`.

<a id="b8"></a>
**B8 · Payroll transaction internals.** Inside the calculate transaction, compensation and YTD reads go through `db` instead of `tx` (`payroll.service.js:303`, `:350`, via `:86-128`), so they run on other connections outside the transaction's snapshot. The per-employee `catch` (`:426-457`) tries to record a `FAILED` item with `tx` after an error; if that error came from a `tx` statement, PostgreSQL has already aborted the transaction and the recovery write fails too, rolling back the whole run. In `processPayrollRun`, PDFs are written to disk inside the transaction (`:597-598`); a rollback leaves files on disk for items still marked `APPROVED`.

<a id="b9"></a>
**B9 · Worker never retries.** `domain-events-worker.cjs:18-29` selects only `PENDING`; a failure sets `FAILED` (`:51-59`) and that event is never selected again, so the 10-attempt `DEAD_LETTER` branch is unreachable. Rows are not claimed, so two workers double-process; a crash leaves rows in `PROCESSING` forever.

---

## Framework-dependent findings (verify before fixing)

<a id="c1"></a>
**C1 · Route `params` in Next.js 16.** `withRoute` passes `context.params` through as-is (`api.js:46`) and every `[id]` handler reads `params.id` synchronously. Since Next.js 15, route-handler `params` is a Promise, and the Next.js 16 upgrade notes describe synchronous access as removed. If that holds for 16.1.6, every `[id]` route receives `undefined` and fails (Prisma rejects `where: { id: undefined }` as a 500). **Check:** `GET /api/payroll/<real id>` — a 200 means the compatibility path still works here; a 500 with a Prisma validation error naming `id` confirms it. Fix either way: `const params = await context.params` in `withRoute`.

<a id="c2"></a>
**C2 · Prisma `Decimal` passed to client components.** `/leave` passes `requests` (`totalDays` is `Decimal`, `schema.prisma:792`) and `policies` (`accrualRate` is `Decimal`, `:749`) as props to the client `LeavePanel` (`src/app/(app)/leave/page.js:8-20`). RSC serialization accepts plain objects and a set of built-ins (BigInt and Date included) but not class instances such as `Decimal`. **Check:** load `/leave` with at least one policy; an error mentioning that only plain objects can be passed to Client Components confirms it. Fix: map rows to plain DTOs (`Number(totalDays)` or `.toString()`) before passing them.

---

## Smaller but real

- **Platform admin cannot use most pages.** Pages call list services without an organization id; for `PLATFORM_ADMIN`, `resolveOrganizationId` throws 400 (`context.js:19-24`). `/admin` — the page labelled "Platform controls" — throws on `listContractTemplates(user)` (`admin/page.js:11`).
- **Frontend reset after await.** `event.currentTarget.reset()` after an `await` in `payroll-panel.js:45`, `leave-panel.js:46`, `contracts-panel.js:46`, `contractors-panel.js:47`, `admin-panel.js:47` and `:100`. React clears `currentTarget` when the handler returns, so these throw on success and show the error text. See [03](03-scope-and-quality.md).
- **Employee form rejects a blank salary.** `employees-panel.js:29` sends `0` when the field is empty; the schema requires a positive number when present (`validators.js:49`), so the create fails with "Request validation failed".
- **Dead encryption.** `sanitizeEmployeeOutput` decrypts `bankAccountEncrypted` (`employee.service.js:24-33`), a column that doesn't exist on `Employee`; `encryptField` has no callers.
- **Silent-fallback secrets.** `AUTH_SECRET || "dev_only_replace_me..."` (`auth.js:10`) — missing secret in prod → sessions signed with a public string, forgeable by anyone. **Fail loudly on missing security config in production.**
- **Dead links in notifications.** `actionUrl` values `/payroll/<id>` (`payroll.service.js:517`), `/my/payslips` (`:619`), `/employees/<id>`, `/employees/<id>/onboarding` and `/contracts/<id>` have no pages. The notifications panel does not render `actionUrl` today, so this is stored data waiting to become broken links.
- **Unmapped Prisma errors.** Unique violations (duplicate payroll period, a concurrent template version, `@@unique([employeeId, policyId])` on a first leave request) surface as generic 500s because `toErrorResponse` only maps `AppError` (`errors.js:16-41`).
- **No login rate limiting** (per-account lockout doesn't stop password spraying); **no request-size cap** on CSV upload; **raw `changes: payload`** in audit logs; **empty `next.config.mjs`** — no security headers.

---

## Practice

1. Write the exploit for A7 (fresh signup edits a global tax rule) and A3 (Org A renders Org B's contractor into a contract). Making it concrete is the fastest way to internalize it. **Check:** a script or HTTP file that a teammate can run against a fresh seed and see the cross-tenant effect.
2. Fix it, then write a regression test asserting 403/404. **Check:** the test fails on the unfixed code and passes on the fix.
3. Generalize: state the rule, then find *every other* place it's violated. **Check:** a table of every `findUnique({ where: { id: payload.* } })` in `src/services/` with a "scoped?" column.
