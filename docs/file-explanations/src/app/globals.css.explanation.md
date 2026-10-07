# Senior Engineering Explanation: `src/app/globals.css`

**Role:** Tailwind 4 entry point plus a small set of design tokens and component classes.

## Walkthrough

- `:1` `@import "tailwindcss"` (Tailwind 4 style, processed by `@tailwindcss/postcss`).
- `:3-11` color tokens (`--bg`, `--panel`, `--ink`, `--accent`, `--line`, `--danger`).
- `:13-18` `@theme inline` maps tokens and font variables into Tailwind's theme.
- `:20-28` body background with two radial gradients.
- From `:34` on: `.panel`, `.input`, `.button-primary`, `.button-secondary`, `.tag`, `.danger`,
  which every panel uses.

## Review notes

- No dark-mode tokens and no focus styles beyond the browser default are defined here.

## Check

**Check:** changing `--accent` at `:7` recolors the primary buttons and the active nav item.
