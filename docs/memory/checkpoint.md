# Checkpoint — Purity for Sugar build

## Phase
Glass theme Phase 2 done (ribbon metrics, icon tiles, sidebar, canvas
chrome, page bar, legend, scrollbars, 24px logo) + netstatus dock made
self-healing (boot + DCL + every setStatus + enriched diagnostics).
Dialog B rebuilt to Scn-2 (two Calculate buttons, no mode select; BPE wall
collapsed + source rounding). Sugar-properties evaluation filed at
`docs/engineering-review/sugar-properties-module-evaluation.md` and EXECUTED
2026-10-03: 8 GIFs in `docs/stencil/reference/` + `formula-registry.md`
(UEI-005/007 RESOLVED, ours confirmed verbatim); Saska 273.15 applied
(main.js:9281 + phase2:47, full suite green); UEI-006/008/009 OPEN;
`tests/properties_crosscheck.js` registered (Martins leg date-gated to
2026-10-12; 5 cp high-T rows FAIL per owner gate, awaiting owner review);
pure functions added (bisection + parameterized Sc, strict coercion).
2026-10-03 cp-harness: Martins Eq.10 pasted to registry (ACTIVE, met due
early); harness reads owner schema (X=Bx, T=K); UEI-010 filed (Leg-2
carve-out). Measured: tertiary agrees at low Bx, diverges 0.11–0.21 above
30 Bx (3 FLAG + 3 tolerance rows, all Bartens/Martins) — WITH OWNER FOR
REVIEW, no merge. Rest of suite green.
2026-10-03 registry-SSOT: Bartens + MET entries machine-readable JSON;
harness evaluates all 3 cp legs from registry with 1e-12 drift alarm vs
engine (12/12 pass); gate rows unchanged, still awaiting adjudication.
Next: owner reviews cross-check results (NO main merge until then),
then Phase 3 (remaining dialogs) or heaters.

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

## 2026-10-03 — Merged to main (UEI-010 ruling)
Harness gate resolved to Martins (harness-only; production Bartens
unchanged). Full suite ALL PASS on feature branch and post-merge on main.
Triage: .gitignore added (zips/chm/Dump/.archify/unreferenced logo/Station
drop-ins stay on disk, out of git). Committed e5c0dc4 on
feature/maxgraph-canvas-spike, merged --no-ff into main. UEI-006 (density)
and UEI-008 (Hugot/Lyle) remain OPEN.

## 2026-10-03 — Pushed to origin/main (9959ef0)
Full-pack push failed twice (HTTP 408 / connection reset on ~36 MB pack);
resolved by incremental push oldest-first (baseline seeds, then
fast-forwards). Remote main == local 9959ef0, tree clean, upstream set.
Note: plain `git push -u origin main` stalls on large first packs from
this machine — seed-then-advance if it recurs.
2026-10-04 density 3-leg (v3): NBS primary / Lyle secondary+bias / MET
tertiary / Martins deprecated — all registry JSON, harness measured green
(4 bias-warnings, 0 critical). UEI-006 RESOLVED. Full suite ALL PASS.
WITH OWNER FOR REVIEW before merge+tag (uei-006-density-harness).
2026-10-04 density merged: f69f721 direct on main, tag uei-006-density-harness pushed. origin/main in sync, tree clean. UEI-006 RESOLVED.
2026-10-04 UEI-BPE-001 ported (oracles+canary, anchors+band enforced). Suite ALL PASS. With owner for review; no merge.
