# Senior Engineering Explanation: `src/lib/api.js`

**Role:** the single wrapper (`withRoute`) that 41 of the 42 API route files use for
authentication, permission checks, body validation, the response envelope and error mapping.
If you understand these 61 lines you understand the contract of every API endpoint.

## Walkthrough

- `parseSearchParams` (`:5-14`) copies the query string into a plain object. Repeated keys keep
  only the last value; values are always strings.
- `withRoute(options, handler)` (`:16-60`) returns the actual Next.js handler `(request, context)`.
  - `:19` `requireSession` is true unless the route passes `auth: false` (login, logout,
    register do).
  - `:20-24` load the user from the `vg_session` cookie (`getRequestUser`, `src/lib/auth.js:132`)
    and throw 401 if there is none.
  - `:26-28` `requirePermission` throws 403 `Missing permission: <name>`.
  - `:30-42` when a `bodySchema` is given: invalid JSON is a 400 `Invalid JSON body`; a schema
    failure is a 400 `Request validation failed` with Zod's flattened errors in `details`.
  - `:44-50` the handler receives `{ request, params, query, user, body }`. `params` is
    `context.params` passed through unchanged.
  - `:52-56` a returned `Response` is passed through (login and register use this to set the
    cookie); anything else becomes `{ ok: true, data: result }`.
  - `:57-59` every throw goes to `toErrorResponse` (`src/lib/errors.js:16`).

## Review notes

- `NextResponse.json` uses `JSON.stringify`, which throws on `BigInt`. Many services return rows
  with `BigInt` money columns, and that throw lands in the `catch` at `:57` as a 500 after the
  work has committed. See `fable/02-bugs-and-security.md#a1`.
- `params` is not awaited at `:46`. In Next.js 15+ the route-handler `params` is a Promise; see
  `fable/02-bugs-and-security.md#c1` for how to check whether this matters on 16.1.6.
- There is no hook for request size, idempotency keys or a non-JSON body, which is why
  `src/app/api/employees/import-csv/route.js` copies the auth and error logic by hand.
- Server pages never pass through this file, so nothing here protects them.

## Check

**Goal:** see each failure branch. **Check:** with no cookie, `POST /api/employees` returns
401 `{ ok: false, error: { message: "Unauthorized" } }`; logged in as `EMPLOYEE` it returns 403
`Missing permission: employees.create`; as `CLIENT_ADMIN` with body `{}` it returns 400
`Request validation failed` and a `details.fieldErrors` object naming `firstName`.
