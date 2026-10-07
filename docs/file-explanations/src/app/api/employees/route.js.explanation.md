# Senior Engineering Explanation: `src/app/api/employees/route.js`

**Contract:**
- `GET`: permission `employees.view`; query `status`, `search`, `organizationId`
  (`src/services/employee.service.js:35-79`).
- `POST`: permission `employees.create`, body `employeeCreateSchema`; creates the employee
  (`:118-184`), then notifies client admins (`:389-415`).

## Review notes

- The notification runs after the transaction; if it throws, the client sees 500 although the
  employee exists.
- The list includes current compensation (`BigInt`), so a non-empty list is subject to the JSON
  serialization problem.

## Check

**Check:** `POST` a valid employee without `compensationAmount`; it returns 200, and
`GET /api/employees?search=<last name>` finds it.
