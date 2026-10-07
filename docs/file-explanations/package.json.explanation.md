# Senior Engineering Explanation: `package.json`

**Role:** dependencies and scripts.

## Notes

- Scripts: `dev`, `build`, `start`, `lint`, five `db:*` scripts and `worker:events`. No `test`
  script.
- Runtime dependencies with no import in `src/`: `stripe`, `nodemailer`, `clsx`.
- `@prisma/client` and `prisma` are both `^6.16.3`; keep them on the same version.
- `next` and `eslint-config-next` are pinned exactly to 16.1.6; React to 19.2.3.
- `db:reset` runs `prisma migrate reset --force`, which replays migrations. There is no
  `prisma/migrations/` folder, so it drops the database and leaves it without tables; follow it
  with `db:push`. (There is no `prisma.seed` entry in this file, so reset does not seed either.)

## Check

**Check:** `grep -rn "from \"stripe\"\|require(\"stripe\")" src` returns nothing.
