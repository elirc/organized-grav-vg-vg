# Senior Engineering Explanation: `src/app/api/auth/logout/route.js`

**Contract:** `POST /api/auth/logout`, no session required. Clears the cookie with
`clearSession` (`src/lib/auth.js:60-69`).

## Review notes

- The JWT is not revoked server-side; a copy of the token stays valid until its 8-hour expiry.
- `auth: false` means logging out without a session also returns 200, which is the right
  behavior for an idempotent logout.

## Check

**Check:** after logout, the response has `Set-Cookie: vg_session=; Max-Age=0`, and
`GET /api/auth/me` returns 401.
