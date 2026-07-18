const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

function getTrackedFiles() {
  return cp
    .execSync("git ls-files", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith("docs/file-explanations/"));
}

function classify(filePath) {
  if (filePath.startsWith("src/app/api/")) return "api-route";
  if (filePath.startsWith("src/services/")) return "domain-service";
  if (filePath.startsWith("src/lib/")) return "shared-library";
  if (filePath.startsWith("src/components/")) return "ui-component";
  if (filePath.startsWith("src/app/(app)/")) return "authenticated-page";
  if (
    filePath.startsWith("src/app/login/") ||
    filePath.startsWith("src/app/signup/") ||
    filePath === "src/app/page.js"
  ) {
    return "public-page";
  }
  if (filePath.startsWith("src/app/")) return "app-shell";
  if (filePath.startsWith("prisma/")) return "database";
  if (filePath.startsWith("public/")) return "asset";
  if (filePath.startsWith("docs/")) return "documentation";
  if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) return "infrastructure-config";
  if (filePath.includes("package-lock.json")) return "dependency-lock";
  if (filePath.endsWith(".json")) return "project-config";
  return "project-file";
}

function isBinary(buffer, filePath) {
  const binaryExt = [".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2"];
  if (binaryExt.includes(path.extname(filePath).toLowerCase())) {
    return true;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 2000));
  for (let index = 0; index < sample.length; index += 1) {
    if (sample[index] === 0) {
      return true;
    }
  }
  return false;
}

function firstLine(text, max = 120) {
  return String(text || "")
    .split(/\r?\n/)[0]
    .trim()
    .slice(0, max);
}

function readLines(content) {
  return content.split(/\r?\n/);
}

function detectImports(content) {
  return [...content.matchAll(/import\s+[^;]+from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .slice(0, 30);
}

function detectExports(content) {
  const names = [];
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)) {
    names.push(match[1]);
  }
  for (const match of content.matchAll(/export\s+const\s+([A-Za-z0-9_]+)/g)) {
    names.push(match[1]);
  }
  for (const match of content.matchAll(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g)) {
    names.push(`${match[1]} (default)`);
  }
  return Array.from(new Set(names)).slice(0, 40);
}

function detectApiMethods(content) {
  return [...content.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/g)].map(
    (match) => match[1],
  );
}

function collectTopLevelVariables(lines) {
  const variables = [];
  let braceDepth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (braceDepth === 0) {
      const match = line.match(/^(const|let|var)\s+([A-Za-z0-9_$]+)/);
      if (match) {
        variables.push({
          kind: match[1],
          name: match[2],
          snippet: line.slice(0, 160),
        });
      }
    }

    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    braceDepth += openCount - closeCount;
    braceDepth = Math.max(0, braceDepth);
  }

  return variables.slice(0, 30);
}

function detectFunctionDetails(content) {
  const details = [];

  for (const match of content.matchAll(
    /(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g,
  )) {
    const name = match[3];
    const params = match[4]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    details.push({ name, kind: "function", exported: Boolean(match[1]), async: Boolean(match[2]), params });
  }

  for (const match of content.matchAll(
    /(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(([^)]*)\)\s*=>/g,
  )) {
    const name = match[2];
    const params = match[4]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    details.push({ name, kind: "arrow", exported: Boolean(match[1]), async: Boolean(match[3]), params });
  }

  return details.slice(0, 60);
}

function detectStateConcepts(content) {
  const concepts = [];
  if (content.includes("useState(")) concepts.push("React local component state (`useState`)");
  if (content.includes("useReducer(")) concepts.push("React reducer-based state (`useReducer`)");
  if (content.includes("useRef(")) concepts.push("React mutable references (`useRef`)");
  if (content.includes("useTransition(")) concepts.push("React transition state for async UI updates");
  if (content.includes("globalThis")) concepts.push("process-wide/global cache via `globalThis`");
  if (content.includes("Map(") || content.includes("new Map(")) concepts.push("module-scope in-memory map state");
  if (content.includes("let connection")) concepts.push("module-scope mutable singleton connection state");
  if (content.includes("cookies(")) concepts.push("request/session state via HTTP cookies");
  if (content.includes("FormData(")) concepts.push("form-bound transient state modeled as `FormData`");
  if (content.includes("process.env")) concepts.push("configuration state sourced from environment variables");
  return concepts;
}

function detectScopeNotes(content, topLevelVars) {
  const notes = [];
  if (topLevelVars.length > 0) {
    notes.push(
      `Module scope declarations are used for reusable constants/helpers: ${topLevelVars
        .map((item) => item.name)
        .slice(0, 8)
        .join(", ")}.`,
    );
  }
  if (content.includes("globalThis")) {
    notes.push(
      "The file intentionally leverages process-level scope (`globalThis`) to cache expensive objects across hot reloads or repeated imports.",
    );
  }
  if (content.includes("new PrismaClient")) {
    notes.push(
      "Database client lifecycle is stabilized by module/global scope, avoiding per-request client re-instantiation.",
    );
  }
  if (content.includes("const SESSION_COOKIE")) {
    notes.push(
      "Session constants are module-scoped to keep auth contract names centralized and non-duplicated.",
    );
  }
  if (notes.length === 0) {
    notes.push(
      "Scope usage is conventional: constants and helpers in module scope, request-specific values inside function scope.",
    );
  }
  return notes;
}

function detectControlFlow(content) {
  const notes = [];
  const tryCount = (content.match(/\btry\b/g) || []).length;
  const catchCount = (content.match(/\bcatch\b/g) || []).length;
  const ifCount = (content.match(/\bif\s*\(/g) || []).length;
  const loopCount =
    (content.match(/\bfor\s*\(/g) || []).length +
    (content.match(/\bfor\s+const\s+/g) || []).length +
    (content.match(/\bwhile\s*\(/g) || []).length;

  if (tryCount > 0 || catchCount > 0) {
    notes.push(`Structured error boundaries are present (try: ${tryCount}, catch: ${catchCount}).`);
  }
  if (ifCount > 0) {
    notes.push(`Conditional branching is used to encode domain/path logic (if-count approx: ${ifCount}).`);
  }
  if (loopCount > 0) {
    notes.push(`Iterative control flow is present for batch or aggregation behavior (loop-count approx: ${loopCount}).`);
  }
  if (content.includes("throw new AppError")) {
    notes.push("Failures are surfaced with typed application errors, preserving stable API error semantics.");
  } else if (content.includes("throw ")) {
    notes.push("The module throws errors directly; callers must preserve consistent error translation.");
  }
  if (notes.length === 0) {
    notes.push("Control flow is mostly linear and declarative in this file.");
  }
  return notes;
}

function detectSideEffects(content) {
  const effects = [];
  if (content.includes("db.")) effects.push("database I/O through Prisma");
  if (content.includes("fetch(")) effects.push("network I/O via HTTP fetch");
  if (content.includes("fs.")) effects.push("filesystem reads/writes");
  if (content.includes("console.")) effects.push("process logging");
  if (content.includes("cookies.")) effects.push("HTTP cookie mutation");
  if (content.includes("enqueue(") || content.includes("new Queue(") || content.includes("new Worker(")) {
    effects.push("asynchronous job queue interactions");
  }
  if (content.includes("response.cookies.set")) effects.push("session cookie issuance/clear");
  if (content.includes("NextResponse.json")) effects.push("HTTP response serialization");
  if (content.includes("createNotification(")) effects.push("user-facing notification side effects");
  if (content.includes("publishDomainEvent(")) effects.push("domain event outbox side effects");
  if (effects.length === 0) effects.push("no major external side effects detected");
  return effects;
}

function detectConcerns(content) {
  const concerns = [];
  if (content.includes("withRoute(")) concerns.push("route-level auth/permission validation");
  if (content.includes("db.$transaction")) concerns.push("transactional consistency");
  if (content.includes("writeAuditLog")) concerns.push("audit logging");
  if (content.includes("publishDomainEvent")) concerns.push("domain event emission");
  if (content.includes("createNotification")) concerns.push("notification dispatch");
  if (content.includes("z.object(")) concerns.push("schema-based input validation");
  if (content.includes("useState(") || content.includes("useTransition(")) {
    concerns.push("client-side state orchestration");
  }
  if (content.includes('fetch("/api') || content.includes("fetch('/api")) {
    concerns.push("UI-to-API command flow");
  }
  if (content.includes("PrismaClient")) concerns.push("database client lifecycle management");
  if (content.includes("Queue") || content.includes("Worker")) concerns.push("background processing");
  if (content.includes("BigInt")) concerns.push("money math using minor units");
  return concerns;
}

function list(items) {
  if (!items || items.length === 0) return "- None detected in this file.";
  return items.map((item) => `- ${item}`).join("\n");
}

function listObjectLines(items, mapper) {
  if (!items || items.length === 0) return "- None detected in this file.";
  return items.map((item) => `- ${mapper(item)}`).join("\n");
}

function overview(kind) {
  const map = {
    "api-route":
      "This file defines an HTTP boundary in the application layer. It should remain transport-focused: auth, validation, and delegation to domain services.",
    "domain-service":
      "This file owns core domain behavior. It is where business invariants, transaction boundaries, and side effects must be coordinated coherently.",
    "shared-library":
      "This file provides shared infrastructure primitives. Its contracts are reused widely, so compatibility discipline is important.",
    "ui-component":
      "This file implements user interaction behavior in the client layer, translating UI events into backend commands and reflecting asynchronous state.",
    "authenticated-page":
      "This page composes authenticated workflows and data views, typically by retrieving server-side data and rendering operational panels.",
    "public-page":
      "This page provides public entry UX and forwards sensitive operations to authenticated backend APIs.",
    "app-shell":
      "This file contributes to global app composition, including layout, metadata, and cross-page shell concerns.",
    database:
      "This file defines persistence-level contracts and data lifecycle operations that downstream services rely on.",
    asset:
      "This file is a static artifact. It has no executable control flow but still impacts runtime payload and product presentation.",
    documentation:
      "This file captures implementation intent and operational context to reduce hidden assumptions for maintainers.",
    "infrastructure-config":
      "This file controls runtime/tooling infrastructure behavior and should remain explicit and reproducible.",
    "dependency-lock":
      "This lockfile provides deterministic dependency resolution and must be treated as high-signal supply chain metadata.",
    "project-config":
      "This file configures core tooling/runtime behavior for consistency across developer and CI environments.",
    "project-file":
      "This repository file contributes to project structure, governance, or platform behavior.",
  };
  return map[kind] || map["project-file"];
}

function buildExplanation(filePath, kind, content, binary) {
  if (binary) {
    return `# Senior Engineering Explanation: \`${filePath}\`

## Ownership and Intent
${overview(kind)}

## Code-Level Applicability
This artifact is binary/static and does not contain executable code-level constructs such as function composition, state transitions, lexical scope layering, or runtime control flow.

## Why This Still Matters
- Asset stability preserves predictable references from the UI/application layer.
- Deterministic file contents improve cache behavior and deployment reproducibility.
- Changes should be intentional because visual assets can influence user trust and perceived quality.
`;
  }

  const lines = readLines(content);
  const imports = detectImports(content);
  const exportsFound = detectExports(content);
  const apiMethods = detectApiMethods(content);
  const topLevelVars = collectTopLevelVariables(lines);
  const functionDetails = detectFunctionDetails(content);
  const stateConcepts = detectStateConcepts(content);
  const scopeNotes = detectScopeNotes(content, topLevelVars);
  const controlFlow = detectControlFlow(content);
  const sideEffects = detectSideEffects(content);
  const concerns = detectConcerns(content);

  return `# Senior Engineering Explanation: \`${filePath}\`

## Ownership and Intent
${overview(kind)}

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
${list(imports)}

Detected exports / entry points:
${list(exportsFound)}

${apiMethods.length > 0 ? `Detected API methods:\n${list(apiMethods)}\n` : ""}

## Code-Level Structure
Approximate line count: ${lines.length}

Top-level declarations (module/global scope candidates):
${listObjectLines(topLevelVars, (item) => `${item.kind} ${item.name} -> \`${item.snippet}\``)}

Function-level structure:
${listObjectLines(functionDetails, (item) => {
    const signature = `${item.async ? "async " : ""}${item.name}(${item.params.join(", ")})`;
    const role = item.kind === "arrow" ? "arrow function" : "function declaration";
    const visibility = item.exported ? "exported" : "internal";
    return `${signature} -> ${role}, ${visibility}`;
  })}

## Scope and State Model
Scope analysis:
${list(scopeNotes)}

State concepts observed:
${list(stateConcepts)}

## Control Flow and Side Effects
Control-flow profile:
${list(controlFlow)}

Observed side effects:
${list(sideEffects)}

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
${list(concerns)}

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
`;
}

function generate() {
  const files = getTrackedFiles();
  const outputRoot = path.join(root, "docs", "file-explanations");
  fs.mkdirSync(outputRoot, { recursive: true });

  let generated = 0;
  for (const filePath of files) {
    const fullPath = path.join(root, filePath);
    const buffer = fs.readFileSync(fullPath);
    const binary = isBinary(buffer, filePath);
    const content = binary ? "" : buffer.toString("utf8");
    const kind = classify(filePath);

    const explanation = buildExplanation(filePath, kind, content, binary);
    const outPath = path.join(outputRoot, `${filePath}.explanation.md`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, explanation, "utf8");
    generated += 1;
  }

  const indexPath = path.join(outputRoot, "INDEX.md");
  const index = [
    "# File Explanation Index",
    "",
    `Generated explanation companions: ${generated}`,
    "",
    "Each tracked file has a mirrored explanation document in this folder.",
    "",
    ...files.map((filePath) => `- [${filePath}](./${filePath}.explanation.md)`),
    "",
  ].join("\n");
  fs.writeFileSync(indexPath, index, "utf8");

  console.log(`Generated ${generated} explanation files with code-level analysis.`);
}

generate();
