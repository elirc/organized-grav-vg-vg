# Senior Engineering Explanation: `src/app/(app)/layout.js`

**Role:** the layout for every authenticated page. The `(app)` folder is a route group: it adds
no URL segment, it only shares this layout.

## Walkthrough

- `:5` `requirePageUser()` redirects to `/login` without a session.
- `:6` renders `AppShell` (sidebar, nav, user, logout) around the page.

## Review notes

- Each page also calls `requirePageUser()`, so the user is loaded twice per page view. React's
  `cache()` around `getServerUser` would de-duplicate it.
- The layout is the natural place for a role check, but it receives no information about which
  page is rendering, so per-page permissions still belong in the pages.

## Check

**Check:** while logged out, every link in `src/components/app-nav.js` redirects to `/login`.
