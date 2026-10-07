# Senior Engineering Explanation: `src/services/dashboard.service.js`

**Role:** the numbers on `/dashboard` and `GET /api/dashboard`.

## Walkthrough

- Platform admin: returns `platformAdminSummary` with `scope: "platform"` (`:6-12`).
- Everyone else (`:14-63`): five parallel queries for headcount, onboarding in progress, runs
  pending approval, the user's unread notifications, and the latest run by `periodEnd`.

## Review notes

- This is the only tenant-scoped service that handles the platform admin without an
  organization id, which is why `/dashboard` is one of the two pages that work for that account.
- `lastPayrollRun` is a full row with `BigInt` totals: fine for the page (RSC), a 500 for
  `GET /api/dashboard` once the run has been calculated.
- "Pending onboarding" counts `IN_PROGRESS` and `PENDING_REVIEW` but not `INVITED`, which is the
  status every new employee starts in, so new hires do not show up there.

## Check

**Goal:** match a card to its query. **Check:** create one employee; "Headcount" goes up by one
and "Pending Onboarding" does not change until their checklist is updated.
