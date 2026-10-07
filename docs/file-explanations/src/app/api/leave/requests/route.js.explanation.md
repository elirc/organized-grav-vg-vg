# Senior Engineering Explanation: `src/app/api/leave/requests/route.js`

**Contract:**
- `GET`: permission `leave.request`; tenant requests, optional `employeeId`/`status`.
- `POST`: permission `leave.request`, body `leaveRequestCreateSchema`
  (`src/lib/validators.js:143-150`).

## Review notes

- Any user with `leave.request` can file leave for any employee in the tenant; nothing ties the
  caller to the employee.
- `policyId` is not tenant-checked, and a caller-supplied `totalDays` overrides the computed one.

## Check

**Check:** after setting that employee's `LeaveBalance.balanceDays` to 10 in the database, a
request with `totalDays: 0.5` for a three-day range is stored with `totalDays = 0.5` and
`pendingDays` grows by 0.5, not 3.
