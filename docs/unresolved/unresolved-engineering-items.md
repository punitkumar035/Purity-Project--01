# Unresolved engineering items

## UEI-001 — Distributor-between-bodies check (T-7)
Status: OPEN (deferred, not blocking).
Question: enforce "all-`1 - First Effect` bodies with per-body TS must be
linked by Distributor stations" as a V-check?
Why it matters: HB Evaporator Examples requires it; direct vapor lines
between separately-targeted single effects unbalance.
Sources checked: `sugars-helpbook.skill` Evaporator_Examples.md (verified quote).
Blocked work: none (single-TS multiples unaffected).
Independent work: everything else.
Required resolution: product-owner confirms severity (error vs warning) + V-code.

## UEI-002 — Syrup-required → juice-required propagation (T-10)
Status: OPEN (deferred; partial helper `applyEvaporatorRequiredInputSemantics` exists).
Question: full backward propagation (last-effect syrup required ⇒ effect-1
juice required, including across link flows)?
Sources checked: HB Evaporator Examples/Features (verified quotes).
Required resolution: solver-propagation design review.

## UEI-003 — Vapor-pressure float across a multiple
Status: OPEN (model limitation, documented).
Question: per-body vapor pressure is an INPUT (spec Pressure/Feedback); SUGARS
floats the whole pressure profile with load. Our bleed vapor Tsat follows the
spec, while juice T / evaporation / steam float (proven in Phase-4).
Required resolution: owner accepts limitation or commissions coupled
multi-effect pressure solve.

## UEI-004 — Dryer BPE uses sucrose correlations
Status: OPEN (owner-accepted limitation, recorded).
Question: Steam Pulp Dryer shares the evaporator calculation incl. sucrose
BPE models (OQ-8). Accept permanently?
Required resolution: owner confirmation (default: accept).

## UEI-005 — Crystal specific heat coefficients
Status: RESOLVED 2026-10-03 (GIF transcription).
Finding: `centHelpbookCrystalCpKJkgK`
(`1.1269 − 4.524e-3·T − 6.24e-6·T²`) matches HB Bartens Eq 311/2
(`reference/HeatContent-2.gif`) VERBATIM. Python module's rising-T form
rejected. Registry: `HB-BARTENS-311-2`.
(Syrup half also confirmed: `centHelpbookSyrupCpKJkgK` matches Eq 341/3
verbatim; Python units-slipped form rejected.)

## UEI-006 — Density correlation sourcing
Status: RESOLVED 2026-10-04 (v3 spec, measured green).
Architecture: NBS C440 Table 114 PRIMARY (registry HB-NBS-C440-RHO, 12-state
grid + beta method); Lyle/Rein Eq 32.8 SECONDARY production leg with logged
bias (registry HB-LYLE-REIN-EQ328-RHO, drift-alarmed vs engine at 1e-12);
MET Brix-SG tertiary advisory (HB-MET-BRIX-DENSITY, IF97 Region-1 water);
Martins Eq.10 DEPRECATED with KNOWN_SYSTEMATIC_BIAS (reference only, never
evaluated). Original Lyle-vs-linear question superseded: linear form retired.
Measured steady state: 4 BIAS-WARNING states (15/85: 15.2, 45/20: 19.9,
45/50: 16.9, 60/85: 17.5 kg/m3), none near the 25 critical line; MET tracks
Lyle within ~2 throughout. Production density unchanged (harness-only).

## UEI-007 — Vavrinecz c=0 branch constants
Status: RESOLVED 2026-10-03 (GIF transcription).
Finding: Wagnerowski branch is `Sc = a·NSW + b` with the STREAM's a/b
(`reference/SucroseSolubility-3.gif`); code branch `sol.a*NSW+sol.b` matches.
Python's hardcoded `1.0−0.088·NSW` is one factory's coefficient pair, never
to be adopted as defaults. Registry: `HB-WAGNEROWSKI`.

## UEI-008 — Hugot/Lyle source rulings
Status: OPEN (partial: syrup/crystal cp now Bartens-confirmed, see UEI-005).
Question: `juiceCpMethod` default `HUGOT_T_PURITY` and Lyle density have no
located in-repo source; brain allows Hugot only where explicitly assigned.
Required resolution: record source ruling in ADR (assignment location or
rename to Bartens-backed default where applicable).

## UEI-009 — Hydrostatic-head BPE correction
Status: OPEN (no source; NOT built).
Question: Python module applies `rho·g·h` hydrostatic correction to pan
pressure. Pan/Crystallizer/Theory sources searched (hydrostatic, head,
height, 9.81, depth) — no backing found.
Required resolution: approved source location, another approved reference
(Rein/Hugot), or explicit owner acceptance with review flag.

## UEI-010 — Accepted structural divergence: T-independent cp leg
Status: ACCEPTED (carve-out, logged not failed).
Finding: the MyEngineeringTools linear leg (`Cp = 4.18 − 2.35·xs`,
XREF-MET-LINEAR-CP) carries no temperature term, so it diverges from both
T-dependent legs (Bartens Eq 341/3, Martins Eq. 10) as T and Brix rise
(measured up to ~0.42 at 60 Bx/85 °C). This is a model-shape difference,
not a defect in any leg.
Rule (owner-locked 2026-10-03): the cross-check harness FAILs only on
T-dependent-pair (Bartens/Martins) diffs — >0.10 fails the row, >0.15
FLAGs for human review. Any Leg-2 pair >0.10 is a `note:` line citing
this UEI, never a failure. Martins is authoritative for
temperature-dependent cp per the registry model-comparison note.

## UEI-010 ruling — Martins wins above 30 Bx (2026-10-03, owner decision)
Measured Bartens↔Martins matrix (harness-enforced pair, now log-only):
45/20 → 0.150; 45/50 → 0.131; 45/85 → 0.109;
60/20 → 0.210; 60/50 → 0.172; 60/85 → 0.126 (kJ/kg·K).
Ruling: the 6 rows above 30 Bx resolve to Martins values; the suite passes
with these logged, not failed. Scope is HARNESS-ONLY: production
`centHelpbookSyrupCpKJkgK` (HB Bartens Eq 341/3, verbatim) is unchanged;
replacing engine cp with Martins would need a separate decision with full
energy-balance revalidation. See evaluation report §7–§8.

## UEI-BPE-001 — Unified BPE harness (bpe_harness_v2.py, Downloads oracle)
Status: EVALUATED + PORTED (oracles + canary in properties_crosscheck.js);
oracle file stays out of repo. No production use.
Provenance (owner-supplied): S&P eq.28 double-sourced (Starzak & Peacock,
Zuckerindustrie 123 (1998) 433-441 eqs.28/32/33 via owner PDF + Saska 2002
eq.3 cross-check). Kadlec eq.32 SINGLE-SOURCE second-hand (1978 original
unsighted) — oracle only, never production without the original.
Ported: S&P eq.28 + Kadlec eq.32 JS oracles (parity anchors pass);
Raoult canary (exact, IF97-native; 0.97 floor physical, 2.5 ceiling
empirical/advisory); S&P<->Kadlec 0.6 band scoped ws 40-80 / t0 50-100;
Saska-at-Q100 offset report-only (measured worst 1.37 over that grid vs
file claim 0.7-1.1). Blend zone + thresholds stay harness-internal.
Saska keeps 273 as printed in that file; engine keeps adopted 273.15.
Stencil spec §8 KBD note corrected to second-hand availability.
Addendum (owner-attributed 2026-10-04): ASI(Q=100) minus S&P offset is
0.59–1.14 °C within ASI's fitted range (ws 65–80, t0 55–75 °C); worst
1.37 °C over the wider scoped grid at ws=80, t0=100 (outside ASI's fitted
t0 range — extrapolation), min 0.22 °C at ws=40, t0=50. Saska 2002 text
states 0.5–1 °C; the earlier "0.7–1.1" was a ws 70–80 subset. Harness logs
in-range worst each run, log-only. Harness now also evaluates the t0=75
edge (ws 65–80): measured in-range worst including t0=75 is 1.142
(consistent with the attributed 0.59–1.14 band at 2-decimal rounding).
