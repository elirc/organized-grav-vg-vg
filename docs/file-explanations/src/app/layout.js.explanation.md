# Senior Engineering Explanation: `src/app/layout.js`

**Role:** the root layout: fonts, global CSS, metadata.

## Walkthrough

- `:1-13` loads Space Grotesk and IBM Plex Mono with `next/font/google` and exposes them as CSS
  variables used in `src/app/globals.css:16-17`.
- `:15-18` page title and description.

## Review notes

- `next/font/google` downloads fonts at build time, so an offline build fails at this file.

## Check

**Check:** the `<body>` element has two generated font-variable class names in the rendered HTML.
