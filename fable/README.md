# Fable Review — Velocity Grid

An honest code review of this EOR platform (Next.js App Router + Prisma + Postgres), doubling as a **junior→mid/senior training guide** for CRUD web app work. Every claim below is tied to a real file and line, and the load-bearing ones were verified against the code, not assumed.

This differs from the `docs/` folder: those are the author's feature writeups ("completed for MVP scope"). This is what's actually true when you run the code.

| Doc | Contents |
|---|---|
| [01-architecture.md](01-architecture.md) | How a request flows, the layering, and the patterns worth keeping |
| [02-bugs-and-security.md](02-bugs-and-security.md) | Verified defects — tenant leaks, authz gaps, the payroll 500, money math, races — with fixes |
| [03-scope-and-quality.md](03-scope-and-quality.md) | Unused half of the schema, dead deps, missing pagination, duplication, the TS case |
| [04-roadmap.md](04-roadmap.md) | What's missing (tests/CI/migrations), the junior→senior habits, exercises on this repo |

## Verdict

**Strong skeleton, unreliable enforcement.** The bones are good: thin routes → services → Prisma, one wrapper (`withRoute`) for auth/validation/errors, money as integer minor units, audit + outbox rows written in the same transaction as the mutation. Many production apps do worse.

The recurring flaw is **a good pattern applied once, then not enforced everywhere**: tenant scoping exists but several paths accept foreign IDs unchecked; status enums define state machines but transitions aren't guarded; money is *stored* as integers but *computed* in floats. And there are **zero tests**, so none of it gets caught. That gap — "I know the pattern" vs "the pattern holds on every path, and a test proves it" — is exactly the junior→senior gap.

## Fix these five first

1. **Payroll 500** — Calculate/Approve/Process commit to the DB, then crash serializing a `BigInt` to JSON; the user sees failure on a success and retries. [02](02-bugs-and-security.md#a1)
2. **Payslip endpoint** — path traversal via `params.id` + no tenant check; any org can read any org's payslip. [02](02-bugs-and-security.md#a2)
3. **Cross-tenant IDs** — `createContract`/`createLeaveRequest` trust foreign `employeeId`/`templateId`/`policyId`. [02](02-bugs-and-security.md#a3)
4. **No transition guards** — you can approve a DRAFT payroll run or re-sign a SIGNED contract. [02](02-bugs-and-security.md#a5)
5. **Disabled users log in** — `UserStatus` LOCKED/DISABLED is never checked. [02](02-bugs-and-security.md#a4)
