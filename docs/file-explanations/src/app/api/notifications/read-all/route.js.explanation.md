# Senior Engineering Explanation: `src/app/api/notifications/read-all/route.js`

**Contract:** `POST /api/notifications/read-all`, permission `notifications.view`. Marks all of
the caller's unread notifications read (`src/services/notification.service.js:57-68`).

## Check

**Check:** the response's `count` equals the "Unread Alerts" number shown on `/dashboard` just
before the call, and the card shows 0 afterwards.
