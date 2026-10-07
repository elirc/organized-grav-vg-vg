# Senior Engineering Explanation: `src/components/panels/payroll-panel.js`

**Role:** create payroll runs and drive Calculate, Approve and Process per run.

## Walkthrough

- `:11-22` `submitJson`, a fetch helper repeated in four other panels.
- `:28-60` create form; dates become ISO strings at UTC midnight.
- `:89-139` three action buttons, always enabled regardless of the run's status.

## Review notes

- `event.currentTarget.reset()` after an await (`:45`).
- Buttons ignore status, so the UI invites approving a `DRAFT` run; the backend does not refuse.
- Calculate/Approve/Process likely report an error after succeeding (BigInt in the JSON
  response), which invites retries.

## Check

**Check:** click Calculate, see the error message, then refresh the page: the run's status is
`PENDING_APPROVAL`.
