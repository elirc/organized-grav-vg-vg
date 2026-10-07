# Senior Engineering Explanation: `src/services/auth.service.js`

**Role:** self-service tenant registration, password login with lockout, and a helper to create
a platform admin.

## Walkthrough

- `validatePasswordStrength` (`:8-13`): 10+ characters, a digit and a non-alphanumeric character.
- `registerOrganizationAdmin` (`:15-112`):
  - rejects weak passwords (`:27-32`) and an existing email with 409 (`:34-40`);
  - hashes with bcrypt cost 12 outside the transaction (`:42`);
  - in one transaction creates an `ACTIVE` organization, its system roles via `ensureBaseRbac`,
    the user, the `CLIENT_ADMIN` role assignment and an audit row (`:44-89`);
  - reloads the user with roles for the response (`:91-111`).
- `loginWithPassword` (`:114-202`):
  - unknown email: 401 `Invalid credentials` (`:139-141`);
  - active lockout: 423 (`:143-145`);
  - wrong password: increments `failedLoginAttempts`, locks for 15 minutes at 5 or more
    (`:149-161`), 401;
  - success: resets the counters, stamps `lastLoginAt`, writes an `auth.login` audit row.
- `bootstrapPlatformAdmin` (`:204-234`): creates a `PLATFORM_ADMIN` user if the email is new. It
  has no callers; the seed creates its admin directly.

## Review notes

- `status` is never checked, so `DISABLED` users log in (`fable/02-bugs-and-security.md#a4`).
- Account existence is observable: register returns 409 for a taken email, a locked account
  returns 423, and an unknown email skips bcrypt so it answers faster.
- The email uniqueness check (`:34-40`) is a read before the transaction; two concurrent
  registrations with the same email reach the unique index, and the loser gets a generic 500.
- After a lock expires, `failedLoginAttempts` is still 5 or more, so the next single failure locks
  the account again immediately (`:150-151`).
- Public registration makes the registrant a `CLIENT_ADMIN`, who holds `tax_rules.manage` on
  global tax rules.

## Check

**Goal:** observe the lockout. **Check:** five wrong passwords for the client admin return 401
four times and then 401 with `lockedUntil` set in the database; the sixth attempt, even with the
right password, returns 423 `Account locked. Please try again later.`
