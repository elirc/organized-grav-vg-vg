# Senior Engineering Explanation: `prisma/seed.js`

**Role:** idempotent-by-intent demo data: permissions, roles, one tenant ("Acme Global"), a
platform admin and a client admin, one employee with compensation, one contractor, a PTO policy,
an employment template, the "Growth" plan and a 20% US income tax rule.

## Walkthrough

- `:6-68` permission names and role grants, copied from `src/lib/permissions.js`.
- `:70-143` local `ensurePermission`, `ensureRole`, `assignRole` (CommonJS copies of
  `src/services/rbac.service.js`).
- `:145-363` `main`: each record is found-or-created or upserted so the script can be rerun.

## Review notes

- `:157-158` upserts `Organization` by `billingEmail`, which is not a unique field
  (`prisma/schema.prisma:261`); Prisma requires a unique selector for `upsert`, so the script
  should stop here on a fresh database (`fable/02-bugs-and-security.md#b7`).
- `:245-257` the compensation has `effectiveDate: new Date()`; payroll runs for earlier periods
  find no compensation and mark the employee `FAILED`.
- `12000000` minor units MONTHLY (`:251-253`) is paid per run.
- No `LeaveBalance` is created, so the PTO policy cannot be used.
- No user is linked to the employee, so contract and payslip notifications have no recipient.

## Check

**Check:** after fixing `:157-158`, running `npm run db:seed` twice prints `Seed complete.` both
times and leaves exactly one "Acme Global" organization.
