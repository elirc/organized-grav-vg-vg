# Senior Engineering Explanation: `src/app/api/leave/balances/route.js`

**Contract:** `GET /api/leave/balances`, permission `leave.request`, optional `?employeeId=`.
Calls `listLeaveBalances` (`src/services/leave.service.js:61-82`).

## Review notes

- Any `EMPLOYEE` sees every balance in their tenant, not just their own; there is no link from
  the requesting user to an employee filter.
- The platform admin sees all tenants' balances.
- `Decimal` fields serialize to JSON as strings via Prisma's `Decimal.toJSON`.

## Check

**Check:** after one leave request, the response contains a balance for that employee and policy
with `pendingDays` equal to the request's days.
