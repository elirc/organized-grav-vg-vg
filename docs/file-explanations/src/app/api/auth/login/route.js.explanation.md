# Senior Engineering Explanation: `src/app/api/auth/login/route.js`

**Contract:** `POST /api/auth/login`, no session required (`auth: false`), body `loginSchema`
(`src/lib/validators.js:5-8`). Calls `loginWithPassword` (`src/services/auth.service.js:114`).

## Walkthrough

- `:8-9` validates and logs in, passing IP and user agent for the audit row.
- `:11-16` builds its own `NextResponse` so it can attach a cookie; `withRoute` passes a
  `Response` through unchanged (`src/lib/api.js:52-54`).
- `:18-21` signs a JWT with `sub` (user id) and `org` (organization id) into `vg_session`.

## Review notes

- The response body includes the full normalized user, including the `organization` row.
- No rate limit beyond the per-account lockout, so many accounts can be tried in parallel.

## Check

**Check:** a successful login returns 200 with a `Set-Cookie: vg_session=...; HttpOnly; SameSite=lax`
header; a wrong password returns 401 `Invalid credentials` and no cookie.
