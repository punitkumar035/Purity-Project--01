# Checkpoint — Purity for Sugar build

## Phase
Glass theme Phase 2 done (ribbon metrics, icon tiles, sidebar, canvas
chrome, page bar, legend, scrollbars, 24px logo) + netstatus dock made
self-healing (boot + DCL + every setStatus + enriched diagnostics).
Next: owner confirms pill beside Reset zoom (or reports the enriched
console line), then Phase 3 (dialogs — the inline-style long tail).

## Completed (with evidence)
- All prior evaporator + Mode-B + branding work (see history below).
- Network solve-state box (UI-9): square-corner box, explicit state colors
  (green `network solved` / red `network unsolved`), state SVG icon, detail
  in tooltip, click-through to Solver Audit. Fixed latent invisibility
  (inherited `--ink` on navy).
- All prior evaporator + Mode-B + branding work (see history below).
- Brain adoption: `AGENTS.md` (authority split: engineering=HB, product=owner),
  full `docs/` tree (decisions/memory/unresolved/conflicts + README stubs),
  ADR-001…005, unresolved UEI-001…004, `modules/` quarantine note.
- Hardening: `installStreamsLiveView` at boot (fresh sessions were
  solver-blind); DRAWING-default investigated (deliberate orphan safety +
  glue-time EXTERNAL — no change); Phase-8 plumbing harness.
- Tests relocated: `tests/evap_phase{1..8}_*.js` + `node tests/run.js`
  (repo-relative paths) — `ALL SUITES PASS`.
- Evaporator stencil Rev 3, Phases 0–3: ports `in0/in1/out0/out1/out2`,
  SI/US units, BPE (Saska/BN transcription-tested), bodyBalance + wrapper + TS loop.
- Phase 4: 4-effect cascade regression (DS 19.8→27.6→40.3→65.0, closure,
  load-float); flash-feed + boil-pinned HTC paths.
- Phase 5: headless live run of real `solveEvaporatorStation` + TS loop.
- Phase 6: property-window corrections (W-01…W-14, X-01…X-10, V-11…V-17,
  status states, TS lock, precision, Option-letter removal, 1..N dropdown).
- Mode-B solve fixes: readiness gate real port IDs (was `steam`/`juice`
  phantoms → all evaporators stuck WAITING_CONNECTION); genuine TS residual;
  TS→steam REQUIRED derivation (state-aware across re-solves); V-14 INFO
  excluded from solve dialog; `evapIllinoisRoot` width criterion fixed
  (was 1-iteration exit for roots > ~250); empty-issues crash guard.
- Branding: `assets/purity-logo.png` (transparent), titlebar, favicon,
  Solve Network button icon.

## Files changed (uncommitted at write time)
- `js/main.js` (solver + dialog), `css/main.css`, `css/ribbon.css`,
  `index.html`, `evaporator_stencil_spec.md` (Evap 0 legend, V-11…V-17),
  `assets/purity-logo.png` (new).
- Harnesses live OUTSIDE repo: `Temp\opencode\evap_phase{1..7}_*.js`
  → to be relocated to `tests/` with `node tests/run.js`.

## Tests
- `node tests/run.js`: syntax + 8 suites, ALL PASS.
- UI acceptance is owner-driven (screenshots); DOM has no automated coverage.

## Known failures / watch items
- None open in solver after Mode-B fixes. Owner live-acceptance pending:
  change-Brix → solve → change-Brix → solve on 4010/4020 with no manual erase.

## Unresolved (see docs/unresolved/)
- T-7 distributor-between-bodies validation (HB-verified, deferred).
- T-10 syrup-required → juice-required propagation beyond existing helper.
- Vapor pressures float per-body only (bleed Tsat follows spec, not load).
- Dryer BPE uses sucrose correlations unchanged (owner-accepted limitation).
- Fresh-session `state.streams` blindness; reload DRAWING-default on
  point stubs (hardening phase).

## Next
1. Solver-plumbing hardening harnesses (streams view, intent default).
2. Relocate harnesses → `tests/` + runner.
3. Heater-family audit (§23/§24 style).
