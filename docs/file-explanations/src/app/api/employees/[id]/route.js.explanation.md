# Senior Engineering Explanation: `src/app/api/employees/[id]/route.js`

**Contract:**
- `GET`: permission `employees.view`; employee with checklist, compensations, contracts and leave
  balances (`src/services/employee.service.js:81-116`).
- `PATCH`: permission `employees.edit`, body `employeeUpdateSchema`
  (`src/lib/validators.js:54-65`).

## Review notes

- `GET` returns compensation rows with `BigInt` amounts, so it fails to serialize for any
  employee with compensation.
- `PATCH` accepts `status: "TERMINATED"` without `employees.terminate`, a permission that exists
  but no route checks.
- `managerId` is not tenant-checked.

## Check

**Check:** `PATCH` with `{"jobTitle":"Staff Engineer"}` returns the updated row and writes an
`employee.updated` event whose payload contains `updates.jobTitle`.
