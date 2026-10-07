# Senior Engineering Explanation: `src/lib/audit.js`

**Role:** one helper, `writeAuditLog(tx, entry)`, that inserts an `AuditLog` row through whatever
Prisma client (usually a transaction) it is given.

## Walkthrough

- `:2-11` destructures the entry with `null` defaults for tenant, user, changes and request meta.
- `:13-24` creates the row. Because callers pass `tx`, the audit row commits or rolls back with
  the change it describes.

## Review notes

- 23 call sites. Most pass the raw request body as `changes`; update paths pass
  `{ before, after }` full rows. Any sensitive field added to those models will be copied into the
  audit log automatically.
- `loginWithPassword` writes its audit row directly with `db.auditLog.create`
  (`src/services/auth.service.js:189-199`), not through this helper.
- Failed logins, tax-rule changes and permission denials are not audited.
- A `changes` object containing a `BigInt` would fail to serialize into the JSON column;
  payroll code converts totals to strings first (`src/services/payroll.service.js:476-480`).

## Check

**Goal:** see an audit trail. **Check:** after editing an employee's job title,
`SELECT action, changes FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 1` shows
`employee.updated` with the old and new titles inside `before` and `after`.
