# Senior Engineering Explanation: `next.config.mjs`

An empty Next.js config. No security headers (CSP, HSTS, frame options), no `serverExternalPackages`
and no body-size settings. `pdfkit` is used from route handlers through
`src/services/payroll.service.js`; if a build complains about its font files, adding it to
`serverExternalPackages` is the usual fix.

## Check

**Check:** `curl -I http://localhost:3000/login` shows no `Content-Security-Policy` or
`Strict-Transport-Security` header.
