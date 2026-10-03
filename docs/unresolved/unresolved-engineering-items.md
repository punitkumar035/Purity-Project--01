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
Status: OPEN.
Question: our Lyle-1957 pure-sucrose Eq 32.8 vs Python linear form
(`rho_water + 3.8·bx + 0.02·bx²`)? Neither appears in skill text; no Lyle
assignment located in-repo.
Required resolution: source assignment (HB location or approved reference)
or owner ruling; cross-check harness carries three-way comparison meanwhile.

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
