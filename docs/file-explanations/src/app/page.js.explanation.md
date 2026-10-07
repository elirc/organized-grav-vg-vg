# Senior Engineering Explanation: `src/app/page.js`

**Role:** the public landing page at `/` with links to `/signup` and `/login`.

## Review notes

- Static; it does not redirect a logged-in user to `/dashboard` the way `/login` and `/signup` do.
- The module list (`:27-34`) promises more than the code delivers (for example compliance and
  background jobs).

## Check

**Check:** "Create Organization" goes to `/signup` and "Sign In" goes to `/login`.
