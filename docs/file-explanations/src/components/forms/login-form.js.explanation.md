# Senior Engineering Explanation: `src/components/forms/login-form.js`

**Role:** the login form.

## Walkthrough

- `:18-22` reads the fields with `FormData` before any `await` (the right way; compare the
  panels that call `event.currentTarget.reset()` after an await).
- `:24-41` posts JSON, shows the server's error message, or navigates to `/dashboard`.

## Review notes

- Uses real `<label>` elements, unlike the employee form, which relies on placeholders.

## Check

**Check:** a wrong password shows "Invalid credentials" under the fields.
