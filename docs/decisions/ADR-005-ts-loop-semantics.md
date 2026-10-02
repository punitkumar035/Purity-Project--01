# ADR-005 — Total-Solids loop semantics (Mode B residual)

## Status
Accepted (Help Book Evaporator Examples + product-owner confirmation).

## Decision
With Total Solids set on a multiple-effect carrier, the outer loop solves
`TS_k(Fs1) − target = 0` where `TS_k` is COMPUTED per trial (carrier solved
without imposed TS, Mode-A sequence). The residual is genuinely monotonic;
imposing TS inside the trial makes it identically zero (degenerate).

## Consequences
- `evaporatorTotalSolidsLoop` evaluates the carrier with `ts:=null`.
- Start guess `E/k`, bounded doubling to finite ground, tolerance at the
  Help Book 0.01% level.
- Carrier DS lands within tolerance, not bit-exact (dialog shows e.g. 64.997%).
