# Senior Engineering Explanation: `src/components/forms/signup-form.js`

**Role:** the tenant registration form; posts to `/api/auth/register` (`:30-47`) and goes to
`/dashboard` on success.

## Review notes

- The client does not pre-check the password rule; the server message is the only feedback.

## Check

**Check:** a successful signup lands on "Organization Dashboard" with all cards at 0.
