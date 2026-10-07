# Senior Engineering Explanation: `src/app/api/employees/[id]/onboarding/route.js`

**Contract:** `PATCH /api/employees/:id/onboarding`, permission `employees.edit`, body
`onboardingUpdateSchema` (the full item array). Calls `updateOnboardingChecklist`
(`src/services/employee.service.js:232-319`).

## Review notes

- No UI calls this route. Employees cannot update their own checklist (they lack
  `employees.edit`).
- The array replaces the stored one entirely; required flags come from the client.

## Check

**Check:** sending all eight default items with status `SUBMITTED` sets the employee's
`onboardingStatus` to `PENDING_REVIEW` and creates an "Onboarding review required" notification
for the client admin.
