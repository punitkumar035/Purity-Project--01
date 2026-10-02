# ADR-001 — Sugar domain vs diagram/editor separation

## Status
Accepted (adopted from brain zip; matches existing app shape).

## Decision
The Sugar engineering domain model is authoritative. Diagram/editor code
(canvas, cells, routing, pages UI) must not silently become the model.

## Consequences
- Solver, balances, validation read domain state, never pixels.
- Sync between editor objects and domain objects (where it exists) must be
  explicit and covered by tests.
- See also: `state.streams` live-view investigation (hardening phase).
