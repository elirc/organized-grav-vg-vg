# Senior Engineering Explanation: `src/services/notification.service.js`

**Role:** create in-app notifications, list them, mark them read.

## Walkthrough

- `createNotification` (`:5-30`): inserts a row, then `enqueue("notification.dispatch", ...)`.
- `listNotifications` (`:32-42`): the user's latest 100.
- `markNotificationRead` (`:44-55`), `markAllNotificationsRead` (`:57-68`): `updateMany` filtered
  by `userId`, so a user cannot mark someone else's notification.
- `getOrganizationUsers` (`:70-84`): no callers.

## Review notes

- Two ways to create notifications exist: this function and direct `tx.notification.create`
  inside transactions (`src/services/employee.service.js:304-313`,
  `src/services/payroll.service.js:610-621`). The direct ones are never enqueued.
- `createNotification` runs outside any transaction; callers invoke it after their transaction
  commits, so a failure here turns a successful operation into a 500.
- `markNotificationRead` returns `{ count }`; marking a nonexistent id returns 200 with
  `count: 0` rather than 404.
- `NotificationPreference` is never read.

## Check

**Goal:** confirm per-user isolation. **Check:** as user A, `PATCH /api/notifications/<B's id>/read`
returns `{ ok: true, data: { count: 0 } }` and B's row stays unread.
