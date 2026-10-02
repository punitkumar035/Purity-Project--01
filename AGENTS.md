# AGENTS.md — Purity for Sugar (PURITY FOR SUGAR™ | Process Simulation)

> Adapted from `Sugar_OpenCode_Brain_Ready_To_Copy.zip` (orchestration content merged, not
> installed verbatim — this environment has no OpenCode agent runtime) and
> `Sugar_Autonomous_Agentic_Team_Master_Protocol.md` (root). The zip is kept in-repo
> as the provenance artifact. Where this file and those sources differ, this file governs
> day-to-day work; genuine conflicts go to `docs/conflicts/`.

## 1. Authority (split by domain)

| Domain | Supreme authority |
|---|---|
| Engineering (formulas, correlations, solver semantics, units, tolerances, ranges, validation rules) | Sugar's Help Book (`sugars-helpbook.skill`), then source-validated stencils/specs (`evaporator_stencil_spec.md`, …), then recorded ADRs |
| Product / workflow (layout, dialog flow, labels, badges, what the owner sees) | Explicit product-owner word, then recorded ADRs |

Below both: existing app behavior (never automatically truth — verify against source first),
then general software conventions.

## 2. Non-negotiable rule

NEVER INVENT ENGINEERING KNOWLEDGE. Missing → `UNKNOWN` / `REFERENCE_REQUIRED` /
`ENGINEERING_REVIEW_REQUIRED` + entry in `docs/unresolved/`, never a guessed value in code.

## 3. Architecture constraints (ADR-001/002/003 apply)

- Sugar domain model stays authoritative; diagram/editor code must not silently become the model.
- Multi-page documents must preserve engineering identity and stream semantics.
- Property windows are schema-driven (`nodeDefs` + stencil specs); the UI invents no fields.
  Every field carries classification, unit, editability, validation, and source where applicable.

## 4. Codebase reality (accepted, see `docs/decisions/`)

- Canonical code is the `js/main.js` monolith. `core/ diagram/ solver/ modules/` ESM is
  detached/broken — do not import from it; see the quarantine note in `modules/`.
- New calculation code must be pure, directly-testable functions (inputs → outputs →
  diagnostics, no DOM). Harness-by-extraction is a bridge, not the pattern for new code.
- Verification lives in `tests/` (`node tests/run.js`). No PASS claim without harness output.

## 5. Lifecycle per task

discover → source → model → stencil → property window → calculation → UI →
integration → test → debug → regression → review → document.
Todo-tracked, one step in progress at a time.

## 6. Autonomy

Proceed without asking on source-backed, unambiguous work. Stop, record, and ask on:
ambiguous source, conflicting requirements, unrecoverable values, model-altering changes,
unclear intent of existing behavior, or safety-critical gaps.

## 7. Session close-out (mandatory)

End every build session by updating `docs/memory/checkpoint.md` (phase, files, tests,
failures, next) and appending durable lessons to `docs/memory/lessons.md`.
Never rely on chat history alone.
