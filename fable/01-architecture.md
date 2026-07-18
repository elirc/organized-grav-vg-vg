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

## Life of a request — `POST /api/employees`

1. Route declares `{ permission: "employees.create", bodySchema: employeeCreateSchema }`.
2. `withRoute` verifies the `vg_session` JWT cookie, loads user+roles+permissions from the DB (`src/lib/auth.js:14`), enforces the permission, validates the body.
3. `createEmployee` (`employee.service.js:118`) resolves the tenant, then in **one transaction** creates the employee, its checklist, its compensation, an **audit log row**, and a **domain-event row**.
4. Returns `{ ok: true, data: employee }`. A worker later drains the event table.

That path touches session auth, RBAC, validation, tenant isolation, transactional writes, audit trails, and the outbox pattern — narrate it fluently and you can explain most of what CRUD backend work is.

## Auth model (mostly right)

- JWT (HS256, 8h) in an **httpOnly + sameSite=lax + secure-in-prod** cookie.
- Token carries only `sub`; roles/permissions are **re-read per request** — permission changes take effect immediately (a deliberate DB-load-for-freshness trade; be able to defend it).
- bcrypt cost 12; no user enumeration (same 401 for bad email vs bad password); 5-attempt lockout (`auth.service.js:150`).
- Tenancy funnels through `resolveOrganizationId` (`context.js:20`): platform admins name an org; everyone else is pinned to their own.

## Patterns worth keeping (steal these)

1. **One wrapper for cross-cutting concerns.** You can audit the whole API surface by grepping route files for `permission:`. Errors are thrown as `AppError` from any depth and mapped once (`errors.js:16`); unknown errors → generic 500, logged, never leaked.
2. **Logic in services, not routes.** Server Components and API routes call the *same* functions — no duplicated business logic.
3. **Money as `BigInt` minor units** in the schema (the standard float defense — though the *math* later betrays it, see [02](02-bugs-and-security.md#b1)).
4. **Transactional outbox + audit, written atomically with the change** (`employee.service.js:171`). The event commits iff the business change does — the correct fix for dual-write inconsistency. (Whether this MVP *needs* it is [03](03-scope-and-quality.md#unused).)
5. **Invariants in the database**, not just app code: `@@unique([payrollRunId, employeeId])`, `@@unique([organizationId, periodStart, periodEnd])`, deliberate `onDelete` (Cascade for owned rows, `Restrict` on in-use leave policies). App code has bugs; unique constraints don't.
6. **App Router split done correctly** — no Redux/React-Query needed; framework primitives (RSC reads, route-handler writes, `useTransition`) are enough. Knowing *why that's sufficient here* is a judgment signal.

## The one-line lesson

> A pattern that *exists* is worth little; a pattern that's *impossible to bypass* is worth a lot. Senior work is turning the first into the second — with helpers that make the right thing the only ergonomic thing, DB constraints, and tests. Everything in [02](02-bugs-and-security.md) is a place this codebase has the first kind but not the second.
