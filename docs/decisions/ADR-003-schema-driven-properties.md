# ADR-003 — Schema-driven property windows

## Status
Accepted (adopted from brain zip).

## Decision
Property windows are generated from approved schemas (`nodeDefs` defaults +
stencil specs such as `evaporator_stencil_spec.md`). The UI invents no fields.

## Consequences
- Every field carries classification, unit, editability, validation, and
  source where applicable (see evaporator dialog rework, Phase 6).
- Divergences between `nodeDefs`, dialog HTML, and solver param reads are
  defects (cf. `evaporatorSpecParams` as the single read path for evaporator).
