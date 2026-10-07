# Senior Engineering Explanation: `src/services/leave.service.js`

**Role:** leave policies, balances, requests and approval decisions.

## Walkthrough

- `toDecimal` (`:8-10`): Prisma `Decimal` to JS float via string.
- `totalLeaveDays` (`:12-14`): calendar days inclusive, weekends and holidays included.
- `listLeavePolicies` (`:16-26`): global plus tenant policies, active only.
- `createLeavePolicy` (`:28-59`).
- `listLeaveBalances` (`:61-82`): own tenant for everyone except the platform admin, who sees all
  tenants' balances.
- `listLeaveRequests` (`:84-115`).
- `createLeaveRequest` (`:117-218`): load the employee and authorize its tenant, load the policy
  (no tenant check), compute days, then in a transaction: find or create the balance, check
  availability, create the request, add to `pendingDays`, audit, event.
- `decideLeaveRequest` (`:220-322`): must be `PENDING`; approve moves days from pending to used,
  reject and cancel release pending days; audit and event.

## Review notes

- Nothing writes `balanceDays`, and new balances start at 0 (`:156`), so every request fails
  `Insufficient leave balance` until balances are written by hand. `accrualRate`,
  `accrualCadence`, `carryOverLimitDays`, `maxBalanceDays` and `lastAccruedAt` are stored but
  unused.
- `requiresApproval` is stored but never consulted; every request waits for a decision.
- Read-modify-write on `pendingDays` and `usedDays` (`:185-192`, `:254-284`) and the status check
  outside the transaction (`:233-235`) allow lost updates under concurrency.
- Caller-supplied `totalDays` wins over the computed value (`:140`).
- `CANCEL` is decided through the same route and permission (`leave.approve`) as approval, so an
  employee cannot cancel their own request.
- First use of a policy by two concurrent requests races on `@@unique([employeeId, policyId])`
  (`prisma/schema.prisma:781`); the loser gets a 500.

## Check

**Goal:** see the empty-balance behavior. **Check:** on a fresh seed, submitting any leave
request for Alex Worker on "Standard PTO" returns 400 `Insufficient leave balance`, and a
`LeaveBalance` row with `balanceDays = 0` now exists.
