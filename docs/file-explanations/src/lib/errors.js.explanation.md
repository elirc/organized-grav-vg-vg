# Senior Engineering Explanation: `src/lib/errors.js`

**Role:** the application error type and the single function that turns any thrown value into
an HTTP response.

## Walkthrough

- `AppError` (`:3-10`): an `Error` with `status` and optional `details`. Services throw it
  from any depth (404 not found, 403 tenant denied, 400 validation, 423 locked).
- `isAppError` (`:12-14`): an `instanceof` check.
- `toErrorResponse` (`:16-41`): an `AppError` becomes `{ ok: false, error: { message, details } }`
  with its status; anything else is logged with `console.error("Unhandled API error", error)` and
  returned as a generic 500 without the message, so internals do not leak.
- `assert` (`:43-47`): throws an `AppError` when a condition is false. It has no callers.

## Review notes

- Prisma's known errors are not mapped. A unique violation (`P2002`, for example a duplicate
  payroll period, `prisma/schema.prisma:612`) or a missing record on update (`P2025`) becomes a
  500 instead of a 409 or 404. Mapping `Prisma.PrismaClientKnownRequestError` codes here would fix
  that for every route at once.
- `instanceof` works because everything runs in one module graph; it is still worth knowing that
  it fails across realms or duplicated package copies.

## Check

**Goal:** see the generic 500 path. **Check:** create two payroll runs with identical
`periodStart`/`periodEnd` for the same tenant; the second returns 500 `Internal server error`
and the server log shows `Unhandled API error` with a Prisma `P2002` unique-constraint error.
