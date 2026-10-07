# Senior Engineering Explanation: `src/app/api/payroll/[id]/route.js`

**Contract:** `GET /api/payroll/:id`, permission `payroll.view`. The run with its items
(`src/services/payroll.service.js:182-196`).

## Check

**Check:** as a client admin of another tenant, the call returns 403 `Tenant access denied`.
