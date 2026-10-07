# Senior Engineering Explanation: `src/app/api/notifications/[id]/read/route.js`

**Contract:** `PATCH /api/notifications/:id/read`, permission `notifications.view`. Marks one
notification read, filtered by the caller's user id
(`src/services/notification.service.js:44-55`).

## Review notes

- Returns `{ count }`; unknown or foreign ids give `count: 0` with status 200.

## Check

**Check:** marking an unread notification returns `count: 1`, and the unread card on
`/dashboard` drops by one.
