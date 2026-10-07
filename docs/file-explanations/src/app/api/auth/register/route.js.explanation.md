# Senior Engineering Explanation: `src/app/api/auth/register/route.js`

**Contract:** `POST /api/auth/register`, public, body `registerSchema`
(`src/lib/validators.js:10-19`). Creates an organization and its first `CLIENT_ADMIN` via
`registerOrganizationAdmin` (`src/services/auth.service.js:15-112`), then sets the session like
login does (`:18-21`).

## Review notes

- Anyone can create a tenant; the new admin holds `tax_rules.manage` over global tax rules.
- No CAPTCHA, email verification or rate limit.
- A taken email returns 409, which confirms that the account exists.

## Check

**Check:** a fresh registration returns 200 with a session cookie, and `/dashboard` then shows
"Organization Dashboard" with headcount 0.
