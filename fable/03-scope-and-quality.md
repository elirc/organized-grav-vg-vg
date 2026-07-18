# 03 — Scope & Code Quality

Two themes: this app is **over-scoped** (Series-B schema, weekend-MVP implementation), and its everyday **craft** has recurring, cheap-to-fix gaps. Neither is an emergency; together they're what decides whether a codebase stays pleasant or rots.

---

<a id="unused"></a>
## Over-engineering — the discipline of *not* building

**~Half the schema has no code behind it.** Grep confirms these models are never queried/created/read anywhere in `src/`: `TimeEntry`, `BenefitsPackage`/`BenefitItem`/`BenefitEnrollment`, `Termination`, `ComplianceDocument`, `CountryConfig`, `Document`, `Invitation`, `NotificationPreference`, `ExchangeRate`, `IdempotencyKey`, `ContractorInvoice`, and `Integration`/`WebhookSubscription` (only `IntegrationLog` is written). That's not a tail — it's close to half of a 1,100-line schema.

Each unused model is carrying cost: it's in every dev's mental model and the generated Prisma types, it *implies a feature that doesn't exist* (docs that lie), and it froze a design decision at the moment you knew least. **You can add a model in five minutes when the feature is real and you finally know its true shape.** Delete what you aren't building this quarter; a `roadmap.md` line signals intent for free.

**Unused dependencies** (zero import sites): `stripe` (invoices are DB rows only), `nodemailer` (no email is ever sent), `clsx` (panels use template strings). Each is supply-chain surface and a false signal. Remove; re-add the day you use them.

**Two job systems, zero real output.** BullMQ enqueues `notification.dispatch` — but **no worker consumes it** (and when Redis is absent, "inline mode" runs nothing). The outbox worker drains `DomainEvent` and… writes an `IntegrationLog` row saying "SUCCESS." No email, no webhook. An MVP on one server needs **zero** of this; notifications already write to the DB and render in-app. The outbox is the *right* pattern — when you have an external side effect to make reliable. Here there's none yet.

**Dead code:** `sanitizeEmployeeOutput` (nonexistent column), `encryptField`, `assert`, `resolveOrg`, `getOrganizationUsers` — all unused. Deleting is the cheapest thing in the world; leaving it forces every reader to check whether it's load-bearing.

**Why this is a *senior* topic:** juniors are praised for adding; the level-up is realizing every line is a liability, you know least at the start, and *deleting* 800 lines of unused schema + two dead job systems makes the codebase measurably better. **Exercise:** do exactly that on a branch, keep it running and seeding, and write one paragraph on how you verified nothing was lost. That paragraph is a senior artifact.

---

## Code quality — the everyday craft

**No pagination anywhere.** Every list (`listEmployees`, `listContracts`, `listPayrollRuns`, …) is an unbounded `findMany`; `listEmployees` also eager-loads three relations per row. `listNotifications` (`take: 100`) is the only bounded one — so the author knows the tool. Invisible at 50 rows, multi-second + OOM at 50k, and it degrades *gradually* so it passes every demo. **A list endpoint without a bound is a bug that hasn't triggered yet.** Fix: a shared `limit`/`cursor` convention.

**Permission list defined twice, by hand** — `src/lib/permissions.js` and `prisma/seed.js` must stay byte-identical. The day they drift, seeded and runtime orgs get different authz. Fix: define once, import into seed. **Any fact expressed in two places will eventually disagree** — that's the real DRY (one authority per truth, not "never repeat a line").

**`withRoute` has a bypass.** `import-csv/route.js` needs `formData`, so it re-implements auth/permission/errors by hand (correctly — but the next copy-paste won't be). Fix: extend the wrapper with `{ parseBody: false }`. **When a good abstraction has an exception, extend it to cover the exception** rather than duplicating around it.

**Hand-rolled CSV parser** (`lib/csv.js`) splits on `\n` first, so a legal quoted field containing a newline breaks it; also BOM, `\r`-in-quotes, ragged rows. Acceptable for an MVP, but `papaparse` deletes a whole class of "one customer's file fails" tickets. **Don't hand-roll parsers for formats with famous edge cases.** (The alias-mapping on top *is* domain-specific and worth keeping.)

**Repetition asking to be extracted:** the `writeAuditLog(tx, {...requestMeta})` block (~20 copies), the fetch-then-`resolveOrganizationId` guard (every `get`/`update` service), the deep `userRoles→role→rolePermissions→permission` include (3 copies), and the client-side `submitJson` helper (copy-pasted verbatim into 6 panels). Extract on the third copy, not the first.

**Magic strings everywhere** — role names, statuses, event types as bare literals; a typo is a silent no-op (query matches nothing). Centralize as constants. This is a frequent real bug source and the strongest argument for the next point.

---

## The elephant: this is JavaScript, not TypeScript

Zod validates the boundary; everything past it is untyped. Nearly every defect in [02](02-bugs-and-security.md) — the BigInt crash, magic-string statuses, `changes: payload` drift, `bankAccountEncrypted` referencing a field that doesn't exist — is a class TypeScript catches at author time for free. Prisma *generates* types; `.js` throws them away. For an app this size, TS is the **highest-ROI single change available**, and "I migrated one service and the compiler immediately found a nonexistent field" is a great interview story. **Types are tests you don't have to write, checked on every keystroke.**

---

## Frontend (smaller, mostly fine)

Architecture is good (RSC reads, route-handler writes, `useTransition`, design tokens in `globals.css`). Gaps:

- **Real bug:** `payroll-panel.js:45` and `leave-panel.js:47` call `event.currentTarget.reset()` *after* an `await` — by then React has nulled `currentTarget`, so it throws on a request that *succeeded*. Fix: capture `const form = event.currentTarget` before the await. **The synthetic event is only valid during the synchronous phase of the handler.** (`employees-panel` avoids this by resetting React state — the right way.)
- **Accessibility:** `employees-panel` uses `placeholder` as the label (vanishes on focus, weak for screen readers); no `aria-live` on error regions. The login form uses real `<label>`s — follow it.
- **Thin error UX:** Zod field errors (`error.details`) are never mapped back to inputs — the user gets "Request validation failed" with no field named.
