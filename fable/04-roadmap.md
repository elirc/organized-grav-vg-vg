# 04 — Junior → Senior Roadmap

The review as a training plan: what's missing entirely, the habits that separate levels, and exercises on *this* repo (you level up by fixing real flawed code, not reading about it).

## Missing entirely (absences, not bugs)

- **Tests — zero.** No file. No unit tests on the tax math (the riskiest code), no integration test on the tenant boundary. This is why every [02](02-bugs-and-security.md) bug survives. Start: unit-test the pure functions (`computeProgressiveTax`, `toMinorUnits`, the CSV mapper — no DB needed, exposes the float bugs immediately); integration-test the invariants that are broken ("Org A can't read Org B," "approve DRAFT rejected," "concurrent leave requests don't over-draw"); a couple of Playwright E2E on the golden path. Learn the **test pyramid** and be able to draw it.
- **Migrations.** Only `db push` — no `prisma/migrations/`, so no versioned, reviewable, reversible schema history. Unacceptable once real data exists. Switch to `migrate dev`/`deploy`.
- **CI.** No workflow. A test not run on every PR rots. install → lint → typecheck → test → build is a half-day with huge leverage.
- **Observability & config validation.** `console.error` is the whole story — add structured logs + request IDs + error tracking. Validate `process.env` once at startup (Zod) and refuse to boot if a secret is missing — turning the [silent-fallback bug](02-bugs-and-security.md) into an impossible state.

## The habit shifts (portable to any CRUD codebase)

| Junior instinct | Senior instinct | Seen here |
|---|---|---|
| Make it work | Make it work, prove it stays working, prove it can't be bypassed | tenant checks exist but skipped ([02·A3](02-bugs-and-security.md#a3)) |
| A pattern I applied | A pattern that's impossible to skip | `withRoute` (good) vs per-entity tenant checks (skipped) |
| Add capability / abstraction | Remove what I don't need yet | half the schema unused ([03](03-scope-and-quality.md#unused)) |
| Validate field types | Validate legal *states of the world* | no `endDate>=startDate`, trusted `totalDays` ([02·B4](02-bugs-and-security.md)) |
| Worked in the demo | Works at 100× data & under concurrency | no pagination; leave-balance race |
| Safe default on error | Fail loud — wrong answer > crash | silent `0`/passthrough on bad money/crypto |
| Code is the deliverable | The *system* is: tests, migrations, CI, docs | all absent |
| DRY every line | One authority per *fact* | permissions defined twice |

Throughline: **juniors optimize "does it work now"; seniors optimize "will it still be correct after 100 commits, 3 engineers, and 1000× data — cheaply, not heroically."** Two more: *trace a value to its boundaries* (the BigInt crash came from not asking "what serializes this?"), and *make illegal states unrepresentable* (every transition bug is a type that permits what the domain forbids — TS + a transition map turns them into compile errors).

## Exercises on this repo, in order

Each ends with a written paragraph — the writing consolidates the lesson and is the interview artifact.

1. **Reproduce & fix one bug.** Click Process, watch the DB commit while the API returns 500 ([02·A1](02-bugs-and-security.md#a1)); fix it at the `withRoute` boundary. *Write: where should DB types become wire types?*
2. **Fix the frontend null-`currentTarget` bug** in both panels. *Write: the rule about events and `await`.*
3. **Fix a whole class.** Write the Org-A-reads-Org-B exploit ([02·A3](02-bugs-and-security.md#a3)); extract `loadScoped(model, id, user)` and use it everywhere a caller-supplied id is fetched. *Write: how you found every instance.*
4. **Add transition guards** to payroll + contracts via one `assertTransition` map ([02·A5](02-bugs-and-security.md#a5)). *Write: why the enum alone didn't prevent it.*
5. **Set up Vitest**; pin the tax brackets with tests, then fix the float math and watch them confirm it. *Write: a case that only fails with floats.*
6. **Integration-test the tenant boundary and the leave race** ([02·B2](02-bugs-and-security.md)). *Write: why the `$transaction` didn't prevent the race.*
7. **Add GitHub Actions** (lint + test + build on PR). *Write: why a test not in CI is worthless.*
8. **Delete the unused schema/deps/dead code** ([03](03-scope-and-quality.md#unused)); keep it running. *Write: what you removed, how you verified it was safe, what you kept and why.*
9. **Migrate one service + route to TypeScript** end-to-end. *Write: every bug the compiler found for free (there's at least one).*
10. **Introduce real migrations**; write the first. *Write: `db push` vs `migrate deploy` in a paragraph a teammate could learn from.*

**Capstone — the interview story.** Take your best two and tell them as: *symptom → reproduction → root cause → fix → generalization → test that proves it.* That arc *is* senior engineering, and telling it convincingly about real code you touched beats any framework on a résumé.

## Reading (pairs with the exercises)

- **OWASP API Security Top 10** — the checklist [02](02-bugs-and-security.md) maps to.
- **Prisma docs: transactions & concurrency** — directly relevant to the race and transition bugs.
- **Ousterhout, *A Philosophy of Software Design*** and ***The Pragmatic Programmer*** — the theory behind [03](03-scope-and-quality.md).
- **Fowler on the Transactional Outbox & Test Pyramid** — names the good pattern this repo already has and the discipline it lacks.

You have a real, flawed, multi-tenant CRUD app in front of you — a far better teacher than a greenfield toy, because the flaws are the curriculum. Work the list in order and you'll operate at a different level by the end.
