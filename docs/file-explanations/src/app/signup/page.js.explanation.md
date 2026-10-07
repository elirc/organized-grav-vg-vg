# Senior Engineering Explanation: `src/app/signup/page.js`

**Role:** `/signup`: public tenant registration. Redirects logged-in users (`:6`) and renders
`SignupForm`.

## Review notes

- This page is the entry point for the cross-tenant tax-rule issue: anyone who signs up becomes a
  `CLIENT_ADMIN`.

## Check

**Check:** a password without a symbol is rejected with the service's message about numbers and
special characters.
