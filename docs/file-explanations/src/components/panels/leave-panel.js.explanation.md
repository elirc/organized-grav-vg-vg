# Senior Engineering Explanation: `src/components/panels/leave-panel.js`

**Role:** submit leave requests and approve or reject pending ones.

## Walkthrough

- `:28-76` request form: employee, policy, dates, reason.
- `:95-141` table with Approve/Reject, disabled unless `PENDING`.

## Review notes

- `event.currentTarget.reset()` after an await (`:46`).
- Any user can pick any employee in the select, which matches the API's lack of an
  employee-to-user check.
- There is no Cancel button, though the API supports `CANCEL`.

## Check

**Check:** after approving a request, both buttons on its row become disabled.
