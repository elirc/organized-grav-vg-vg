# Senior Engineering Explanation: `src/lib/money.js`

## Ownership and Intent
This file provides shared infrastructure primitives. Its contracts are reused widely, so compatibility discipline is important.

## How the Implementation Works
The file is structured around explicit module responsibilities and clear entry points. Import dependencies define collaboration boundaries, while exported symbols provide the public contract consumed by other layers.

Detected imports:
- None detected in this file.

Detected exports / entry points:
- toMinorUnits
- fromMinorUnits
- sumMinor
- minorToCurrency



## Code-Level Structure
Approximate line count: 37

Top-level declarations (module/global scope candidates):
- const MINOR_UNIT_MULTIPLIER -> `const MINOR_UNIT_MULTIPLIER = 100;`

Function-level structure:
- toMinorUnits(value) -> function declaration, exported
- fromMinorUnits(value) -> function declaration, exported
- sumMinor(values) -> function declaration, exported
- minorToCurrency(value, currency = "USD") -> function declaration, exported

## Scope and State Model
Scope analysis:
- Module scope declarations are used for reusable constants/helpers: MINOR_UNIT_MULTIPLIER.

State concepts observed:
- None detected in this file.

## Control Flow and Side Effects
Control-flow profile:
- Conditional branching is used to encode domain/path logic (if-count approx: 3).

Observed side effects:
- no major external side effects detected

## Why It Is Implemented This Way
Design choices in this file prioritize explicit contracts, predictable side effects, and maintainable layering. This helps the team evolve behavior without hidden coupling.

Cross-cutting concerns currently present:
- money math using minor units

## Safe Extension Guidance
- Keep business rules in the owning layer (service layer for domain policy, route layer for transport policy, UI layer for interaction policy).
- Preserve existing exported contracts when possible; when changes are required, update all call sites in the same change set.
- Keep module-scope mutable state minimal and intentional; prefer explicit factories for complex lifecycle state.
- For stateful UI files, keep pending/error/success transitions explicit and deterministic.
- For backend files with side effects, maintain idempotency and transactional coherence to avoid partial writes.
