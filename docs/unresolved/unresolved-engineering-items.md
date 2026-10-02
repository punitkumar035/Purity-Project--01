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
