# Lessons (durable, harness-linked)

## 2026-10-02 — State widgets must own their colors and shapes
Problem: solve-state pill showed near-invisible text (inherited near-black
`--ink` on a navy box) and callers passed free-form text with no state mapping.
Fix: box owns explicit per-state color + fixed state labels derived from the
existing `cls` channel; detail text moved to tooltip; shape set explicitly
(square). UI state must never depend on inherited context.
Regression test: tests/ui_phase9_netstatus.js (plus the ribbon-scoping fix:
equal-specificity later-file-wins in ribbon.css was overriding state colors —
scoped `.ribbon-status .status-pill.<state>` rules win structurally).

## 2026-10-02 — Match the screenshot, not the interpretation
Problem: Dialog B grew a mode dropdown + single Calculate that SUGARS never
had (Scn-2: two Calculate buttons, no mode). Owner asked "vice versa" —
the screenshot already answered how.
Fix: rebuilt to Scn-2 exactly; kept one deliberate, recorded deviation
(editable Q/DT for what-if sizing).
Permanent rule: Extracted_Property_Windows screenshots outrank prior
implementation choices; deviations from them are recorded, never silent.
Regression test: Phase-6 dialog asserts + Phase-2 rounding unit test.

## 2026-10-02 — Relocated widgets keep ids, handlers follow the element
Problem: moving the solve-state pill + engine badge out of their strip.
Fix: move (never clone) after the builder appends them; address everything
by id afterwards. Canvas anchors used are static index.html elements.
Postscript: when the pill still didn't appear, the guarded move hid the
failure — hardened with try/catch inserts, a post-boot placement check
(parent + non-zero width), and a visible toast + console line on failure.
A hidden widget must always explain itself.
Follow-up: one-shot docking is fragile against late/duplicate renders, so
docking is now continuous — re-asserted on boot, DOMContentLoaded, every
setStatus call, and the verifier; diagnostics log toolbar count and the
fitBtn anchor to discriminate duplicate-toolbar vs missing-anchor causes.
Regression test: tests/ui_phase9_netstatus.js (relocation + dock asserts).

## 2026-10-02 — Theme in a last-loaded layer, new tokens only
Problem: reskinning against 319 inline styles + competing same-specificity
rules across stylesheets (the invisible-pill bug was equal-specificity +
later-file-wins in ribbon.css).
Fix: `css/theme-glass.css` loads last and wins ties; only NEW --glass-*
tokens (core vars untouched); component phases convert inline paint to
classes as touched. State widgets keep scoped color rules that beat any
legacy override. Ornaments without DOM homes (row chevrons, group marks)
go in as CSS ::before/::after; never add dead controls (no collapse chevron
where no collapse behavior exists). Global box-sizing changes tile math:
size width/height as TOTAL tile, glyph = tile minus padding.
Regression test: tests/ui_phase9_netstatus.js (glass asserts).

## 2026-10-01 — Phantom port IDs park whole stations
Problem: all evaporators stuck `WAITING_CONNECTION` on fully-wired flowsheets.
Root cause: readiness gate checked `steam`/`juice`/`vapour`/… ports that do not
exist (stencil ports are `in0/in1/out0/out1/out2`); every other touchpoint used
the real IDs, and the sibling `structuralValidation` did too — only the gate diverged.
Fix: extracted testable `evaporatorTopologyReady` with real IDs.
Permanent rule: port-ID literals must come from `nodeDefs`/spec, and every
gate touching them gets a unit test.
Regression test: Phase-7 section A.

## 2026-10-01 — Dimensionless width criterion in root finders
Problem: `evapIllinoisRoot` returned after ONE iteration for roots > ~250.
Root cause: bracket-width exit reused the energy-scaled `tol` for a flow-width
test (`|b−a| ≤ tol·|c|` with tol≈265000 — vacuously true). Near-linear cases
looked fine; nonlinear ones came back up to 6% off.
Fix: dimensionless `1e-12·max(1,|c|)` width test.
Permanent rule: convergence criteria must be dimensionally consistent with the
iterated variable; audit any `tol` used in two unit systems.
Regression test: Phase-3 `illinois sqrt(2)` + all energy-secant paths.

## 2026-10-01 — Derived solver flags must be state-aware across runs
Problem: TS→steam REQUIRED derivation cleared its own flag on re-solve
(solved flow mistaken for user input) → false T-5 over-specified block every
second run; owner had to hand-erase the steam quantity.
Fix: derive only onto blank/non-REQUIRED; clear only on owner loss/run break
(blanking the system-owned flow with it).
Permanent rule: any flag the solver derives must record provenance
(`autoQuantityRule`) and never treat its own output as user input.
Regression test: Phase-7 re-solve + Brix-change blocks.

## 2026-10-01 — Imposed targets make secant residuals degenerate
Problem: TS loop always returned its first guess (residual identically zero —
carrier TS was mass-imposed inside every trial).
Fix: HB procedure — carrier solved WITHOUT imposed TS, residual is computed
DS minus target (ADR-005).
Permanent rule: never impose the target inside the trial function of an
outer iteration; assert `iterations ≥ 1` and root-moved in loop tests.
Regression test: Phase-7 steam ≠ first guess + energy-consistency asserts.

## 2026-10-01 — Unbracketed secant dies on narrow feasible bands
Problem: TS loop failed "Secant residual is not finite" on models with a
narrow feasible steam band (cascade starvation / DS>=95 guard make the
residual NaN outside it) — the secant stepped out and aborted instead of
recovering.
Fix: geometric grid scan (ratio 1.15, NaN-tolerant with consecutive-miss
cap) for the first adjacent finite sign change, then Illinois (never leaves
the bracket). All failures name the body via lastErr in the V-10 message.
Permanent rule: outer iterations over partially-feasible domains must be
bracketed, never raw secant; failure messages must name the failing station.
Regression test: Phase-7 infeasible-carrier + e2e bracket asserts.

## 2026-10-03 — p2num masks missing coefficient inputs (strict coercion for APIs)
Problem: new parameterized Sc functions used UI-tolerant p2num (non-numeric
-> 0), so omitted coefficients were silently accepted as 0. Harness caught
it ("rejects missing coeffs" failed).
Fix: p2finStrict (null/undefined/''/non-finite -> NaN, rejected) for all
coefficient/state inputs of programmatic property APIs. Permanent rule:
UI-tolerant coercion stays at the UI boundary; pure calculation APIs
validate strictly.
Regression test: properties_crosscheck no-defaults asserts.

## 2026-10-03 — Cross-check oracles: report-only beats enforced bands
Problem: first harness version asserted pass/fail bands around a REJECTED
oracle (simplified steam fits), going red on the oracle's own errors.
Fix: rejected-oracle comparisons are REPORT-ONLY (measured numbers are the
rejection evidence); enforced tolerances apply only to owner-set gates
(cp +/-0.10, bartens-divergence flag >0.15). Permanent rule: never let a
rejected reference fail the suite — record its measured distance instead.

## 2026-10-03 — Registry-driven harness: parse the owner schema, not the placeholder
Problem: first Martins gate parsed a placeholder shape ({variables, terms[]});
the delivered entry uses equation.coefficients{a,b,d,f} with X in degBrix
and T in Kelvin. Reusing the placeholder evaluator would have computed
garbage in wrong units.
Fix: parser rewritten to the delivered schema with explicit unit handling
(X=Bx as-is, T=tC+273.15) plus uuid+status asserts and valid-range NaN
guard. Permanent rule: pasted source schemas are byte-adopted; placeholder
shapes are retired with the paste, never adapted.
Regression test: properties_crosscheck martins-active asserts.

## 2026-10-04 — Reference grids: verify provenance before enforcing
Problem: v2 density spec labeled a 12-state grid "Lyle Eq 32.8, verified
within ~3" that measured up to 19.9 off the engine. Enforcing it would have
gone red against a mislabeled reference (same failure mode as the steam
oracle). Resolution: owner relabeled grid as NBS data (v3), gates rebuilt
as log-only with critical escalation.
Permanent rule: every pasted reference grid gets a provenance check
(spot-verify 2+ states against the cited source) before any assert is
written against it; log-only until provenance lands.
