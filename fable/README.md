# Fable Review — Velocity Grid

An honest code review of this EOR platform (Next.js App Router + Prisma + Postgres), doubling as a **junior→mid/senior training guide** for CRUD web app work. Every claim below is tied to a real file and line and was checked by reading that code. Nothing in this folder was produced by running the app; where an outcome depends on runtime or framework behavior, the text says so and gives a **Check** you can run.

This differs from the `docs/` folder: those are the author's feature writeups ("completed for MVP scope"). This folder is what the code actually does.

| Doc | Contents |
|---|---|
| [01-architecture.md](01-architecture.md) | How a request flows, the layering, and the patterns worth keeping |
| [02-bugs-and-security.md](02-bugs-and-security.md) | Defects found in the code — tenant leaks, page-level authz bypass, global tax rules, the payroll 500, money math, races, seed crash — with fixes |
| [03-scope-and-quality.md](03-scope-and-quality.md) | Unused half of the schema, dead deps, missing pagination, duplication, the TS case |
| [04-roadmap.md](04-roadmap.md) | What's missing (tests/CI/migrations), the junior→senior habits, exercises on this repo |

## Verdict

**Strong skeleton, unreliable enforcement.** The bones are good: thin routes → services → Prisma, one wrapper (`withRoute`) for auth/validation/errors, money as integer minor units, audit + outbox rows written in the same transaction as the mutation. Many production apps do worse.

The recurring flaw is **a good pattern applied once, then not enforced everywhere**: tenant scoping exists but several paths accept foreign IDs unchecked; status enums define state machines but transitions aren't guarded; money is *stored* as integers but *computed* in floats. And there are **zero tests**, so none of it gets caught. That gap — "I know the pattern" vs "the pattern holds on every path, and a test proves it" — is exactly the junior→senior gap.

## Fix these first

1. **Global tax rules are writable by any tenant** — `CLIENT_ADMIN` holds `tax_rules.manage` and signup is public, so a stranger can change every tenant's payroll tax. [02](02-bugs-and-security.md#a7)
2. **Pages skip permission checks** — `/payroll`, `/reports`, `/employees`, `/admin` render for any logged-in role; only the API enforces permissions. [02](02-bugs-and-security.md#a0)
3. **Payroll 500** — Calculate/Approve/Process commit to the DB, then crash serializing a `BigInt` to JSON; the user sees failure on a success and retries. [02](02-bugs-and-security.md#a1)
4. **Payslip endpoint** — no tenant check; any org with `payroll.view` can read any org's payslip by item id. [02](02-bugs-and-security.md#a2)
5. **Cross-tenant IDs** — `createContract`/`createLeaveRequest` trust foreign `employeeId`/`contractorId`/`templateId`/`policyId`. [02](02-bugs-and-security.md#a3)
6. **No transition guards** — you can approve a DRAFT payroll run, re-process a COMPLETED one, or PATCH a contract straight to SIGNED. [02](02-bugs-and-security.md#a5)
7. **Disabled users log in** — `UserStatus` LOCKED/DISABLED is never checked. [02](02-bugs-and-security.md#a4)

Before any of that, two things decide whether you can run the app at all: the seed's `upsert` on a non-unique `billingEmail` ([02·B7](02-bugs-and-security.md#b7)) and the Next.js 16 route-`params` question ([02·C1](02-bugs-and-security.md#c1)). Check both first.

## How to use this folder

- Read [01](01-architecture.md) with the code open; do its three exercises.
- Read [02](02-bugs-and-security.md) one item at a time; each has a file:line, a fix and a rule. Items marked **Check** tell you exactly what to observe.
- [03](03-scope-and-quality.md) is the "how would a senior simplify this" pass.
- [04](04-roadmap.md) turns all of it into an ordered exercise list.

Line numbers refer to this snapshot of the code. If you have edited a file, re-locate the reference by the function name given next to it.
