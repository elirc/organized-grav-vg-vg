# Senior Engineering Explanation: `jsconfig.json`

Defines the `@/*` path alias to `./src/*`, used by every import such as `@/lib/db`. The worker
(`src/workers/domain-events-worker.cjs`) and the seed (`prisma/seed.js`) run under plain Node,
where the alias does not resolve, which is why they import `@prisma/client` directly and
duplicate logic instead of importing from `src/lib` or `src/services`.
