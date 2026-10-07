# Senior Engineering Explanation: `postcss.config.mjs`

Registers the `@tailwindcss/postcss` plugin, which is how Tailwind 4 processes the
`@import "tailwindcss"` at the top of `src/app/globals.css`. There is no `tailwind.config.js`;
Tailwind 4 reads theme values from the `@theme` block in the CSS instead.
