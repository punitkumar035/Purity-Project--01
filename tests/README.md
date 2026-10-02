# tests/

Contract: `node tests/run.js` from the repo root runs everything. No PASS
claim without this runner's output.

- `evap_phaseN_*` — evaporator verification line (units → BPE → solver →
  cascade → live loop → property window → Mode-B solve → plumbing).
- Phase-0 harnesses are superseded (kept out); UI acceptance stays
  owner-driven via screenshots (no DOM automation in this repo).
- Harnesses resolve `js/main.js` relative to the repo — portable, no
  machine-specific paths.
- Legacy harnesses extract code by source slicing; per ADR-004, NEW
  calculation code must be directly importable pure functions instead.
