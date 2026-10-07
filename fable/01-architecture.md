# 01 — Architecture & What's Good

## Shape

Multi-tenant EOR SaaS. Clean three-layer backend, idiomatic App Router frontend:

```
Server Component (app/(app)/*/page.js)  ──calls──▶ Service ──▶ Prisma ──▶ Postgres
Client panel (components/panels/*) ──fetch──▶ API route ──withRoute──▶ Service
```

- **Routes** (`src/app/api/**/route.js`) are ~10 lines — they declare *what's required*, not *how*.
- **`withRoute`** (`src/lib/api.js:16`) is the one choke point: session → permission → Zod body validation → handler → `{ok,data}` / `{ok,error}` envelope → error mapping.
- **Services** (`src/services/*.service.js`) hold all business logic and take plain args `(user, payload, requestMeta)` — unit-testable without HTTP.
- **Reads** go through Server Components calling services directly (no HTTP hop); **writes** go through API routes, then `router.refresh()` re-syncs.
- **Caveat on the read path:** pages call `requirePageUser()` (`src/lib/page-auth.js:4-12`) and then the service. The permission check lives only in `withRoute`, so the RSC path enforces login and tenant but not permission. See [02 · A0](02-bugs-and-security.md#a0).

## Life of a request — `POST /api/employees`

1. Route declares `{ permission: "employees.create", bodySchema: employeeCreateSchema }` (`src/app/api/employees/route.js:10-17`).
2. `withRoute` verifies the `vg_session` JWT cookie, loads user+roles+permissions from the DB (`src/lib/auth.js:14`), enforces the permission, validates the body.
3. `createEmployee` (`employee.service.js:118`) resolves the tenant, then in **one transaction** creates the employee, its checklist, its compensation (only when `compensationAmount` is present, `:147-158`), an **audit log row** (`:160-169`), and a **domain-event row** (`:171-180`).
4. The route then calls `inviteEmployeeNotification` (`employee.service.js:389-415`) **outside** that transaction, so a failure there returns a 500 for an employee that was already created.
5. Returns `{ ok: true, data: employee }`. A worker later drains the event table.

That path touches session auth, RBAC, validation, tenant isolation, transactional writes, audit trails, and the outbox pattern — narrate it fluently and you can explain most of what CRUD backend work is.

## Auth model (mostly right)

- JWT (HS256, 8h) in an **httpOnly + sameSite=lax + secure-in-prod** cookie.
- Token carries only `sub`; roles/permissions are **re-read per request** — permission changes take effect immediately (a deliberate DB-load-for-freshness trade; be able to defend it).
- bcrypt cost 12; the same 401 "Invalid credentials" for an unknown email and a wrong password (`auth.service.js:139-141`, `:161`); 5-attempt lockout (`auth.service.js:150-151`).
- Enumeration is still possible by other routes: an unknown email returns without running bcrypt (a timing difference), a locked account answers 423 (`:143-145`), and `/api/auth/register` answers 409 "An account with this email already exists" (`:38-40`).
- Tenancy funnels through `resolveOrganizationId` (`context.js:18`): platform admins name an org; everyone else is pinned to their own.

## Patterns worth keeping (steal these)

1. **One wrapper for cross-cutting concerns.** You can audit the whole API surface by grepping route files for `permission:`. Errors are thrown as `AppError` from any depth and mapped once (`errors.js:16`); unknown errors → generic 500, logged, never leaked.
2. **Logic in services, not routes.** Server Components and API routes call the *same* functions — no duplicated business logic.
3. **Money as `BigInt` minor units** in the schema (the standard float defense — though the *math* later betrays it, see [02](02-bugs-and-security.md#b1)).
4. **Transactional outbox + audit, written atomically with the change** (`employee.service.js:160-180`). The event commits iff the business change does — the correct fix for dual-write inconsistency. (Whether this MVP *needs* it is [03](03-scope-and-quality.md#unused).)
5. **Invariants in the database**, not just app code: `@@unique([payrollRunId, employeeId])` (`schema.prisma:651`), `@@unique([organizationId, periodStart, periodEnd])` (`:612`), `@@unique([employeeId, policyId])` on leave balances (`:781`), deliberate `onDelete` (Cascade for owned rows, `Restrict` on in-use leave policies, `:804`). App code has bugs; unique constraints don't. One caveat: `Role` is `@@unique([organizationId, name])` (`:356`) and the global `PLATFORM_ADMIN` role has `organizationId = null`; PostgreSQL treats NULLs as distinct in unique indexes, so that constraint does not stop a second global `PLATFORM_ADMIN` row.
6. **App Router split done correctly** — no Redux/React-Query needed; framework primitives (RSC reads, route-handler writes, `useTransition`) are enough. Knowing *why that's sufficient here* is a judgment signal. The split has a cost the code does not pay yet: anything the API enforces must be enforced again on the page path.

## Exercises

1. **Goal:** narrate the write path from memory. **Check:** you can list, in order and with file:line, the five things that happen between `fetch("/api/employees")` and the `{ ok: true }` response, including which of them is outside the transaction.
2. **Goal:** find every place the codebase reaches the database without `withRoute`. **Check:** your list contains all ten pages under `src/app/(app)/` plus `src/app/api/employees/import-csv/route.js`, and for each you can say whether a permission is checked.
3. **Goal:** test the claim "role changes take effect immediately". **Check:** remove `payroll.view` from a role in the database while that user is logged in; the next `GET /api/payroll` returns 403 without a new login.

## The one-line lesson

> A pattern that *exists* is worth little; a pattern that's *impossible to bypass* is worth a lot. Senior work is turning the first into the second — with helpers that make the right thing the only ergonomic thing, DB constraints, and tests. Everything in [02](02-bugs-and-security.md) is a place this codebase has the first kind but not the second.
