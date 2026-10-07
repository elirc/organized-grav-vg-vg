# Senior Engineering Explanation: `src/app/api/auth/me/route.js`

**Contract:** `GET /api/auth/me`, any authenticated user, returns `{ user }` as built by
`normalizeUserContext` (`src/lib/auth.js:100-130`).

## Review notes

- Nothing in `src/components/` calls this endpoint; pages get the user on the server instead.
- Useful for debugging permissions: the response lists the effective permission names.

## Check

**Check:** logged in as the client admin, the response's `data.user.permissions` contains
`tax_rules.manage` and `roles` is `["CLIENT_ADMIN"]`.
