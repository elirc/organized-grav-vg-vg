# Senior Engineering Explanation: `src/lib/page-auth.js`

**Role:** session helpers for server components.

## Walkthrough

- `requirePageUser` (`:4-12`): loads the user from cookies (`getServerUser`) and redirects to
  `/login` if there is none.
- `redirectIfAuthenticated` (`:14-19`): used by `/login` and `/signup` to send logged-in users to
  `/dashboard`.

## Review notes

- This is the only check pages perform. There is no permission parameter, so pages under
  `src/app/(app)/` show data to roles the API would refuse (`fable/02-bugs-and-security.md#a0`).
  A `requirePageUser("payroll.view")` overload would close that.
- The `(app)` layout calls `requirePageUser` (`src/app/(app)/layout.js:5`) and every page calls it
  again, so each page load reads the user from the database twice.

## Check

**Goal:** see the redirect. **Check:** in a private window, open `/payroll`; the browser lands
on `/login`.
