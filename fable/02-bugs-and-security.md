# 02 — Bugs, Security & Data Integrity

Ordered by severity. The unifying theme: the right controls exist (`resolveOrganizationId`, permissions, `BigInt` storage) but hold on *some* paths, not all. A control that holds 8 of 10 paths gives the security of 0 — an attacker only needs the 2.

Each item: **where → why it breaks → fix → the general rule.**

---

<a id="a1"></a>
## A1 · Payroll returns 500 on success (confirmed, user-visible)

`calculatePayrollRun` (`payroll.service.js:522`) returns a Prisma row with `BigInt` fields; `withRoute` then does `NextResponse.json(...)`, and **`JSON.stringify` throws on BigInt**. The throw is inside `withRoute`'s `try`, so it's caught and mapped to a generic **500** — *after* the transaction has committed. Affects `calculate`/`approve`/`process`, `POST /api/payroll`, `/api/dashboard`, invoice lists.

The tell: the *same rows* cross the RSC boundary fine (React's Flight serializer supports BigInt); only the JSON path breaks. One value, two serializers, different capabilities.

**Fix:** convert BigInt at the `withRoute` boundary (`JSON.stringify(result, (_,v)=>typeof v==="bigint"?v.toString():v)`), or return DTOs so BigInt never leaves the service.
**Rule:** decide *once* where DB types become wire types. Leaking ORM rows straight to transport is the root cause here and in A6/A7.

---

<a id="a2"></a>
## A2 · Payslip download: path traversal + IDOR

`app/api/documents/payslips/[id]/route.js` builds `storage/payslips/${params.id}.pdf` from raw input and streams it, gated only on `payroll.view`.

- **Path traversal:** `params.id` is concatenated into a filesystem path unvalidated; `path.join` normalizes `../` and climbs out of the directory.
- **IDOR:** any user with `payroll.view` in *any* org reads *any* org's payslip by knowing a `payrollItem` id (cuids leak in other responses). The permission checks "can view payroll," never "can view *this* payroll."

**Fix:** look up the item, `resolveOrganizationId(user, item.payrollRun.organizationId)`, and build the path from the **DB-derived** id, never raw input.
**Rule:** never build a filesystem path from request input; an ID in a URL is not authorization. (Broken object-level authorization is #1 on the OWASP API Top 10 — and it recurs below.)

---

<a id="a3"></a>
## A3 · Cross-tenant IDs are trusted

`resolveOrganizationId` guards the *primary* entity but not related IDs in the payload:

- `createContract` (`contract.service.js:154`) fetches `payload.employeeId` and `templateId` with bare `findUnique` — no org filter — then renders that (possibly other-org) employee's name/title into a contract. Cross-tenant exfiltration.
- `createLeaveRequest` (`leave.service.js:130`) trusts `payload.policyId`; you can attach your employee to another org's policy.
- `createEmployee` never validates `managerId` — set it to anyone, any org, or a random cuid.

**Fix:** re-fetch every caller-supplied id **scoped to the resolved org** (`findFirst({ where:{ id, organizationId }})`). Wrap it as `loadScoped(model, id, user)` so it can't be forgotten.
**Rule:** authorize *every* identifier the caller controls, not just the route's subject.

---

<a id="a4"></a>
## A4 · `UserStatus` is never enforced

Schema has `LOCKED`/`DISABLED` (`schema.prisma:17`), but `loginWithPassword` checks only `lockedUntil` and never `status`, and `normalizeUserContext` never consults it. A disabled/terminated account keeps working.
**Fix:** reject non-`ACTIVE` at login and treat non-`ACTIVE` as unauthenticated in `withRoute`. **Rule:** a status enum nothing branches on is a latent security bug.

---

<a id="a5"></a>
## A5 · No state-machine guards

Rich status enums, almost no transition checks:

- `approvePayrollRun` (`payroll.service.js:525`) doesn't require `PENDING_APPROVAL` — approve a DRAFT, or re-approve a COMPLETED run.
- `processPayrollRun` doesn't require `APPROVED` and isn't idempotent — process twice → duplicate payslips + duplicate notifications. Combined with A1 (false 500 → retry), double-processing is *likely*.
- `signContract` (`contract.service.js:318`) doesn't require `SENT` — sign a DRAFT, or re-sign a SIGNED contract, overwriting `signatureData`.

**Fix:** guard every transition (`if (run.status !== "PENDING_APPROVAL") throw new AppError(409, ...)`); ideally one central `assertTransition(from,to)` map. `decideLeaveRequest` already does this — apply it to payroll and contracts too.
**Rule:** a status column is a state machine; every write must assert the edge is legal.

---

<a id="a6"></a>
## A6 · Broken function-level authorization on signing

`contracts/[id]/sign/route.js` requires `contracts.view` (which `EMPLOYEE` and `CLIENT_MANAGER` both hold), and `signContract` never checks the signer *is* the counterparty. Any employee can sign anyone's contract, recording their own name/IP as the signature — a legal-integrity hole in an e-signature flow.
**Fix:** verify the signer matches the contract's employee/contractor. **Rule:** permissions answer "what class of action"; object checks answer "on which object"; you need both.

---

## Data-integrity defects

<a id="b1"></a>
**B1 · Money stored as int, computed as float.** The tax engine does `Number(minor)/100`, floats the math, rounds back (`payroll.service.js:16-73`). Over many employees/brackets these errors accumulate and won't reconcile to the penny. Fix: integer/decimal math end to end; round only at explicit, documented points. *(This is the "how do you handle money" interview answer.)*

**B2 · Leave-balance race.** `createLeaveRequest` reads `pendingDays` into a JS float, adds, writes back (`leave.service.js:190`). Two concurrent requests both read the old value → one increment lost, and the "insufficient balance" check is bypassable. The surrounding `$transaction` doesn't help — the read isn't locking. Fix: atomic `{ pendingDays: { increment } }` or a `FOR UPDATE` locking read. **A `$transaction` gives atomicity of your writes, not protection from concurrent readers** — classic senior interview point.

**B3 · No idempotency, despite an `IdempotencyKey` table nobody uses.** `generateMonthlyInvoice` double-clicks into two invoices (no unique constraint like payroll runs have). Fix: wire the table (accept `Idempotency-Key` in `withRoute`) or add `@@unique` on invoice period.

**B4 · Validation checks fields, never relationships.** No `endDate >= startDate` anywhere (leave/payroll/contracts accept inverted ranges → negative day counts). `totalDays` is caller-supplied and trusted — recompute server-side. `employmentCountry` is free-text, so "US"/"USA"/"us" silently fails the exact-match tax lookup (`payroll.service.js:352`) → $0 tax, no error. Fix: `.refine()` cross-field rules; recompute derived values; enumerate country codes. **Rule:** validation is "is this a legal state of the world," not "is each field the right type."

**B5 · Silent failure modes.** `toMinorUnits` returns `0` on NaN (bad salary → free employee); `computeTaxForRule` returns 0 for an unknown `calculationType` (typo'd rule → no tax); failed payroll items are swallowed and the run still shows `PENDING_APPROVAL` as if complete; `decryptField` returns ciphertext on error. Fix: fail loud. **Rule:** a wrong answer is worse than a crash — especially for money.

---

## Smaller but real

- **Dead encryption.** `sanitizeEmployeeOutput` decrypts `bankAccountEncrypted`, a column that doesn't exist; `encryptField` is never called (grep-confirmed). The README says bank details are encrypted — nothing is.
- **Silent-fallback secrets.** `AUTH_SECRET || "dev_only_replace_me..."` (`auth.js:10`) — missing secret in prod → sessions signed with a public string, forgeable by anyone. `FIELD_ENCRYPTION_KEY` missing → `encryptField` returns plaintext. **Fail loudly on missing security config in production.**
- **No login rate limiting** (per-account lockout doesn't stop password spraying); **no request-size cap** on CSV upload (whole file read into memory before the 500-row check); **raw `changes: payload`** in audit logs (allow-list fields instead); **empty `next.config.mjs`** — no CSP/HSTS/security headers.

---

## Practice

1. Write the exploit for A2/A3 (log in as Org A, read Org B's data) — making it concrete is the fastest way to internalize it.
2. Fix it, then write a regression test asserting 403/404.
3. Generalize: state the rule, then find *every other* place it's violated. One instance → the whole class is the senior move. Map these to the **OWASP API Security Top 10** and you'll recognize the shapes everywhere.
