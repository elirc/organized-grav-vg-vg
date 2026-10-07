# Senior Engineering Explanation: `src/lib/auth.js`

**Role:** session cookie handling, loading the current user with roles and permissions, and the
permission predicates used by `withRoute`.

## Walkthrough

- Constants (`:6-7`): cookie `vg_session`, lifetime 8 hours.
- `getAuthSecret` (`:9-12`): `AUTH_SECRET` or the literal `dev_only_replace_me_32_characters_min`.
- `loadUserContext` (`:14-34`): one query loading the user, organization, and
  `userRoles -> role -> rolePermissions -> permission`.
- `createSessionToken` / `setSession` (`:36-58`): HS256 JWT with `iat` and `exp`, set as an
  httpOnly, `sameSite: "lax"` cookie, `secure` only when `NODE_ENV === "production"`.
- `clearSession` (`:60-69`): overwrites the cookie with `maxAge: 0`. The JWT itself stays valid
  until it expires; there is no server-side revocation.
- `readSessionFromRequest` / `readSessionFromCookies` (`:71-98`): the same verify logic, one for
  route handlers (`request.cookies`) and one for server components (`await cookies()`). Any
  verification error returns `null`.
- `normalizeUserContext` (`:100-130`): flattens roles to names and permissions to a list;
  `PLATFORM_ADMIN` short-circuits to `"*"` (`:109-112`). The returned object includes the full
  `organization` row.
- `getRequestUser` / `getServerUser` (`:132-150`): read the token's `sub`, then reload the user
  from the database on every call. Role changes therefore apply on the next request.
- `hasPermission` / `requirePermission` / `requireAuth` (`:156-174`).

## Review notes

- The secret fallback at `:10` means a production deploy without `AUTH_SECRET` signs sessions with
  a string published in this repository. Throw at startup instead.
- `user.status` is loaded but never checked, so `LOCKED` and `DISABLED` users stay authenticated
  (`fable/02-bugs-and-security.md#a4`).
- The token also carries `org` (set at `src/app/api/auth/login/route.js:20`), but nothing reads it;
  the organization comes from the database row.
- A deleted user's token yields `null` from `loadUserContext`, which becomes a clean 401.

## Check

**Goal:** confirm permissions are not baked into the token. **Check:** decode the `vg_session`
cookie at jwt.io (or with `jose.decodeJwt`): the payload has only `sub`, `org`, `iat` and `exp`.
