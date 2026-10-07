# Senior Engineering Explanation: `src/components/logout-button.js`

**Role:** posts to `/api/auth/logout`, then navigates to `/login` and refreshes.

## Review notes

- The response is not checked; on a network failure the user is sent to `/login`, which redirects
  back to `/dashboard` because the cookie is still set.

## Check

**Check:** after clicking Sign Out, the browser's cookie storage no longer has `vg_session`.
