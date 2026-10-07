# Senior Engineering Explanation: `src/app/(app)/notifications/page.js`

**Role:** `/notifications`: the current user's latest 100 notifications.

## Review notes

- Scoped by `userId`, so it is safe for every role, and it renders for the platform admin.

## Check

**Check:** after creating an employee as the client admin, a "New employee added" notification
appears at the top.
