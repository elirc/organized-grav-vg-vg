# Senior Engineering Explanation: `src/app/(app)/employees/page.js`

**Role:** `/employees`: add form, CSV tools and the employee table.

## Review notes

- No `employees.view` check; any role sees every employee in the tenant, and the props include
  each employee's current compensation even though the table does not display it.
- Throws for the platform admin.

## Check

**Check:** in the browser's React DevTools (or the RSC payload in the Network tab), the props for
`EmployeesPanel` include `compensations[0].amountMinor` for Alex Worker.
