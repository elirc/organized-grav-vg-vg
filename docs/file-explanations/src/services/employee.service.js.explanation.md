# Senior Engineering Explanation: `src/services/employee.service.js`

**Role:** employee CRUD, onboarding checklist, compensation history and CSV import.

## Walkthrough

- `defaultChecklist` (`:11-22`): eight onboarding items, seven required.
- `sanitizeEmployeeOutput` (`:24-33`): meant to decrypt `bankAccountEncrypted`; that column does
  not exist, so it only adds `bankAccountEncrypted: null`.
- `listEmployees` (`:35-79`): tenant-scoped, optional status and case-insensitive search across
  names and emails, includes manager, checklist and current compensation. Unbounded.
- `getEmployee` (`:81-116`): load with compensations, contracts and leave balances, then tenant
  check.
- `createEmployee` (`:118-184`): one transaction creating the employee (`ONBOARDING`/`INVITED`),
  checklist, optional current compensation, audit row and `employee.created` event.
- `updateEmployee` (`:186-230`): tenant check, `data: payload`, before/after audit, event.
- `updateOnboardingChecklist` (`:232-319`): replaces the whole item array; if every required item
  is `SUBMITTED` or `VERIFIED`, sets `PENDING_REVIEW` and notifies client admins inside the
  transaction.
- `addCompensationRecord` (`:321-387`): marks the current compensation not current, creates a new
  one linked by `previousId`, audit row and event.
- `inviteEmployeeNotification` (`:389-415`): notifies client admins; called after creation.
- `importEmployeesFromCsvRows` (`:417-483`): up to 500 rows, map, validate, then `createEmployee`
  per row, collecting per-row results.

## Review notes

- `managerId` is never checked against the tenant (`:133`, `:200`).
- The checklist update trusts the client to send all items; a client that sends only optional
  items, all `VERIFIED`, makes `allRequiredSubmitted` true (`:243-245`) because there are no
  required items left to fail the `every`.
- `addCompensationRecord` reads the current compensation inside the transaction but without a
  lock; two concurrent changes can both mark the same row and leave two `isCurrent: true` rows.
- Compensation `effectiveDate` can be in the future, but `isCurrent` flips immediately, so payroll
  for the current period then finds no compensation with `effectiveDate <= periodEnd`
  (`src/services/payroll.service.js:86-99`) and fails the employee.
- The CSV import has no `organizationId` in its payload (`:445-457`), so platform admins cannot
  use it.

## Check

**Goal:** see the compensation chain. **Check:** add two compensation records to one employee;
`SELECT id, "previousId", "isCurrent" FROM "Compensation" WHERE "employeeId" = '<id>' ORDER BY "createdAt"`
shows three rows where only the last is current and each `previousId` points at the row before.
