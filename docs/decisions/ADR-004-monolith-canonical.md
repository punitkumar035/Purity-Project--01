# ADR-004 — Monolith is canonical; new calculations are pure functions

## Status
Accepted (product-owner decision: "bless monolith").

## Context
`js/main.js` (~17.7k lines) is the shipped application. The ESM tree
(`core/ diagram/ solver/ modules/`) is detached and unrunnable
(duplicate-export breakage among other drift) and nothing imports it.

## Decision
1. `js/main.js` is the canonical codebase. Do not attempt to rewire the app
   onto the ESM tree without a dedicated, owner-approved migration task.
2. `modules/` is quarantined (see `modules/README.md`): read-only reference,
   never import, never extend.
3. All NEW calculation code must be pure, directly-testable functions
   (inputs → outputs → diagnostics, no DOM access), callable from the
   monolith and from `tests/` without source-text extraction.
4. Harness-by-extraction (`eval` of sliced source) remains the bridge for
   LEGACY monolith code only.

## Consequences
- `tests/run.js` may import new pure modules directly; legacy coverage keeps
  the extraction pattern until the covered code is refactored.
- Any edit that widens the monolith's DOM/calculation entanglement needs an
  ADR before merging.
