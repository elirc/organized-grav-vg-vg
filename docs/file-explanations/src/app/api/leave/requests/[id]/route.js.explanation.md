# Senior Engineering Explanation: `src/app/api/leave/requests/[id]/route.js`

**Contract:** `PATCH /api/leave/requests/:id`, permission `leave.approve`, body
`leaveDecisionSchema` (`APPROVE`, `REJECT` or `CANCEL` plus an optional comment). Calls
`decideLeaveRequest` (`src/services/leave.service.js:220-322`).

## Review notes

- The only state machine in the app with a guard: non-`PENDING` requests return 400.
- An approver can approve their own request; nothing compares the approver with the employee.
- `CANCEL` requires `leave.approve`, so employees cannot withdraw their own requests.

## Check

**Check:** approving the same request twice returns 200 then 400 `Leave request is not pending`.
