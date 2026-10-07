# Senior Engineering Explanation: `src/components/app-nav.js`

**Role:** the sidebar navigation (client component, because it reads the current path).

## Walkthrough

- `:6-17` ten fixed links.
- `:25` a link is active on an exact match or any sub-path.

## Review notes

- Every role sees every link, including Admin and Payroll. Hiding links is not security, but
  filtering by the user's permissions would make the UI match what the API allows.

## Check

**Check:** on `/payroll`, only the Payroll link has the accent background.
