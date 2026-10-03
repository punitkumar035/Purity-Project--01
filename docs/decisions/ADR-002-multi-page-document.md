# ADR-002 — Multi-page documents preserve engineering identity

## Status
Accepted (adopted from brain zip).

## Decision
Multi-page documents (`state.pages[]`) must preserve station identity and
stream semantics across page operations (create/rename/reorder/delete/
duplicate/switch) and save/load.

## Consequences
- Page ops must be covered by persistence tests once the tests/ runner lands.
- `saveActivePageData` / `activatePage` must keep nodes/connectors/streams
  views consistent (known gap area — see hardening notes).
