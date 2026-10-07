# Senior Engineering Explanation: `eslint.config.mjs`

ESLint 9 flat config: `eslint-config-next/core-web-vitals` plus its default ignores (`.next`,
`out`, `build`, `next-env.d.ts`). `npm run lint` runs it.

## Notes

- No rules beyond Next's defaults; nothing would flag the `event.currentTarget` after `await`
  pattern in the panels or unused exports such as `assert` and `resolveOrg`.

## Check

**Check:** add a plain `<img src="/next.svg" />` to a page and run `npm run lint`; the Next.js
rule `@next/next/no-img-element` reports it.
