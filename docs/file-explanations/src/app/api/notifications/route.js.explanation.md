# Senior Engineering Explanation: `src/app/api/notifications/route.js`

**Contract:** `GET /api/notifications`, permission `notifications.view`. The caller's latest 100
notifications (`src/services/notification.service.js:32-42`).

## Review notes

- Hard limit of 100 with no cursor; older notifications are unreachable.
- The UI does not call this route; `/notifications` reads through the service.

## Check

**Check:** the response is ordered newest first and contains only rows whose `userId` is the
caller's.
