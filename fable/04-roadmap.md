# 04 — Junior → Senior Roadmap

The review as a training plan: what's missing entirely, the habits that separate levels, and exercises on *this* repo (you level up by fixing real flawed code, not reading about it).

## Missing entirely (absences, not bugs)

- **Tests — zero.** No test file and no `test` script in `package.json`. No unit tests on the tax math (the riskiest code), no integration test on the tenant boundary. This is why every [02](02-bugs-and-security.md) bug survives. Start: unit-test the pure functions (`computeProgressiveTax`, `toMinorUnits`, the CSV mapper — no DB needed, exposes the float bugs immediately); integration-test the invariants that are broken ("Org A can't read Org B," "approve DRAFT rejected," "concurrent leave requests don't over-draw"); a couple of Playwright E2E on the golden path. Learn the **test pyramid** and be able to draw it.
- **Migrations.** Only `db push` — no `prisma/migrations/`, so no versioned, reviewable, reversible schema history. Unacceptable once real data exists. Switch to `migrate dev`/`deploy`.
- **CI.** No `.github/` folder at all. A test not run on every PR rots. install → lint → typecheck → test → build is a half-day with huge leverage.
- **Observability & config validation.** `console.error` is the whole story — add structured logs + request IDs + error tracking. Validate `process.env` once at startup (Zod) and refuse to boot if a secret is missing — turning the [silent-fallback bug](02-bugs-and-security.md) into an impossible state.

## The habit shifts (portable to any CRUD codebase)

| Junior instinct | Senior instinct | Seen here |
|---|---|---|
| Make it work | Make it work, prove it stays working, prove it can't be bypassed | tenant checks exist but skipped ([02·A3](02-bugs-and-security.md#a3)) |
| A pattern I applied | A pattern that's impossible to skip | `withRoute` (good) vs per-entity tenant checks (skipped) |
| Add capability / abstraction | Remove what I don't need yet | half the schema unused ([03](03-scope-and-quality.md#unused)) |
| Validate field types | Validate legal *states of the world* | no `endDate>=startDate`, trusted `totalDays` ([02·B4](02-bugs-and-security.md)) |
| Worked in the demo | Works at 100× data & under concurrency | no pagination; leave-balance race |
| Checked on the path I wrote | Checked on every path that reaches the data | API enforces permissions, pages don't ([02·A0](02-bugs-and-security.md#a0)) |
| Safe default on error | Fail loud — wrong answer > crash | silent `0`/passthrough on bad money/crypto |
| Code is the deliverable | The *system* is: tests, migrations, CI, docs | all absent |
| DRY every line | One authority per *fact* | permissions defined twice |

Throughline: **juniors optimize "does it work now"; seniors optimize "will it still be correct after 100 commits, 3 engineers, and 1000× data — cheaply, not heroically."** Two more: *trace a value to its boundaries* (the BigInt crash came from not asking "what serializes this?"), and *make illegal states unrepresentable* (every transition bug is a type that permits what the domain forbids — TS + a transition map turns them into compile errors).

## Exercises on this repo, in order

Each ends with a written paragraph — the writing consolidates the lesson and is the interview artifact — and a **Check**: something you can observe that tells you the exercise is done.

0. **Get it running.** Fix the seed ([02·B7](02-bugs-and-security.md#b7)) and settle the route-`params` question ([02·C1](02-bugs-and-security.md#c1)). *Write: what the seed error said and why `upsert` needs a unique field.* **Check:** `npm run db:seed` prints `Seed complete.` and both seed accounts can log in; `GET /api/payroll/<id>` returns 200 for a real run.
1. **Reproduce & fix one bug.** Click Calculate, watch the DB commit while the API returns 500 ([02·A1](02-bugs-and-security.md#a1)); fix it at the `withRoute` boundary. *Write: where should DB types become wire types?* **Check:** Calculate, Approve and Process each return 200 with the totals as strings, and `GET /api/billing/invoices` returns 200.
2. **Fix the frontend null-`currentTarget` bug** in all five panels ([03](03-scope-and-quality.md)). *Write: the rule about events and `await`.* **Check:** each create form clears itself after a successful submit and shows no error.
3. **Close the page-level authz hole** ([02·A0](02-bugs-and-security.md#a0)). *Write: why the check belongs below both entry points.* **Check:** an `EMPLOYEE`-only user gets a 403 page (or a redirect) on `/payroll`, `/reports`, `/employees` and `/admin`, and still sees `/leave` and `/notifications`.
4. **Fix a whole class.** Write the cross-tenant exploits ([02·A3](02-bugs-and-security.md#a3), [A7](02-bugs-and-security.md#a7)); extract `loadScoped(model, id, user)` and use it everywhere a caller-supplied id is fetched; restrict `tax_rules.manage` to the platform. *Write: how you found every instance.* **Check:** the exploit requests now return 403/404, and a grep for `findUnique({ where: { id: payload.` in `src/services/` returns nothing.
5. **Add transition guards** to payroll + contracts via one `assertTransition` map ([02·A5](02-bugs-and-security.md#a5)). *Write: why the enum alone didn't prevent it.* **Check:** approving a `DRAFT` run and processing a `COMPLETED` run both return 409, and `PATCH /api/contracts/<id>` with `{"status":"SIGNED"}` is rejected.
6. **Set up Vitest**; pin the tax functions with tests, then fix the float math and the pay-frequency handling ([02·B1](02-bugs-and-security.md#b1), [B6](02-bugs-and-security.md#b6)). *Write: a case that only fails with floats.* **Check:** `npm test` exists and passes, including a `PROGRESSIVE_BRACKET` case with at least three brackets and a `WAGE_BASE_CAP` case that crosses the cap mid-year.
7. **Integration-test the tenant boundary and the leave race** ([02·B2](02-bugs-and-security.md#b2)). *Write: why the `$transaction` didn't prevent the race.* **Check:** a test that fires two concurrent leave requests against a balance that fits only one, and asserts exactly one succeeds.
8. **Make the outbox real** ([02·B9](02-bugs-and-security.md#b9)): claim rows atomically, retry `FAILED` with backoff, recover stuck `PROCESSING`. *Write: at-least-once vs exactly-once in two sentences.* **Check:** an event whose handler throws three times then succeeds ends `PROCESSED` with `attempts = 4`.
9. **Add GitHub Actions** (lint + test + build on PR). *Write: why a test not in CI is worthless.* **Check:** a PR that breaks a test shows a red check.
10. **Delete the unused schema/deps/dead code** ([03](03-scope-and-quality.md#unused)); keep it running. *Write: what you removed, how you verified it was safe, what you kept and why.* **Check:** `npm run build` and `npm run db:push` succeed and the seed still completes.
11. **Migrate one service + route to TypeScript** end-to-end. *Write: every bug the compiler found for free (there's at least one: `bankAccountEncrypted`).* **Check:** `tsc --noEmit` passes for the migrated files.
12. **Introduce real migrations**; write the first. *Write: `db push` vs `migrate deploy` in a paragraph a teammate could learn from.* **Check:** `prisma/migrations/` exists and `prisma migrate deploy` applies it to an empty database.

**Capstone — the interview story.** Take your best two and tell them as: *symptom → reproduction → root cause → fix → generalization → test that proves it.* That arc *is* senior engineering, and telling it convincingly about real code you touched beats any framework on a résumé.

## Reading (pairs with the exercises)

- **OWASP API Security Top 10** — the checklist [02](02-bugs-and-security.md) maps to.
- **Prisma docs: transactions & concurrency** — directly relevant to the race and transition bugs.
- **Ousterhout, *A Philosophy of Software Design*** and ***The Pragmatic Programmer*** — the theory behind [03](03-scope-and-quality.md).
- **Fowler on the Transactional Outbox & Test Pyramid** — names the good pattern this repo already has and the discipline it lacks.

You have a real, flawed, multi-tenant CRUD app in front of you — a far better teacher than a greenfield toy, because the flaws are the curriculum. Work the list in order and you'll operate at a different level by the end.
