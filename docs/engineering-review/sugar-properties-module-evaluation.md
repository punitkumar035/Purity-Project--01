# Sugar Properties Module — Evaluation Report

**Status:** EVALUATION EXECUTED 2026-10-03 (working tree; no merge).
Owner decisions applied per "BPE Module — Evaluation Response & Build
Decisions". Gibbs: GIF extraction proved §2.3/§2.4/§2.6/§2.7 verdicts
correct — ours matched the Help Book verbatim in all four.
**Date:** 2026-10-03
**Subject:** `sugar_properties_module.py` (Downloads copy, external reference) vs
our Universal Flow property engine (`js/main.js` stream/property sections).
**Method:** analytical formula-vs-formula comparison against the Help Book
skill (`sugars-helpbook.skill`) and repo sources. As written for sections 1-5,
no code was executed; sections 6-10 report executed harness output.

---

## 1. Authority used

- `sugars-helpbook.skill` → `references/Theory/Theory.md` (Vavrinecz,
  Wagnerowski, Van Hook supersaturation, Bartens Eq refs), Pan/Crystallizer
  property docs, Evaporator docs.
- Brain pack: `hugot/SKILL.md`, `MEMORY.md` (Hugot/Rein use rules).
- Repo: `js/main.js` (IF97 service, BPE, cp/enthalpy/density, Vavrinecz,
  mother-liquor supersaturation, `calculateUniversalStream`),
  `evaporator_stencil_spec.md`.
- Opened question at every gap is answered here with a verdict, not a guess.

---

## 2. Claim-by-claim verdicts

### 2.1 Steam tables (Python simplified fits vs our full IAPWS-IF97)
**Verdict: REJECT adoption. Ours stands.**
Our engine is full IF97 (Region 1/2/4/PT services); the Python file uses
simplified polynomials (claimed ±0.1 °C). Same physics, strictly lower
fidelity. Keep the Python side only as a differential-test oracle
(independent code path, same physics) — never as a calculation source.

### 2.2 Saska BPE coefficients
**Verdict: IDENTICAL — no action except §5.2.**
Both use AX 0.1660 / BX 1.1394 / CX 1.9735 / DX 0.1237 with
`W/(100−W)`, `((273[+.15]+tbW)/100)^CX`, `(Q/100)^DX`. OnlyMechanical
difference: Python takes pressure (computes tbW inside); ours takes tbW
directly. Equivalent.

### 2.3 Syrup specific heat — CONFLICT
- Python (claimed Bartens 8th ed. Eq 341/3):
  `4.1868·(1 − 0.0058·bx/100)·(T-correction)`.
- Ours (`centHelpbookSyrupCpKJkgK`):
  `4.1868 − DS·(0.0297−4.6e-3) + 7.5e-5·DS·T`.
- Spot check at 60Bx/70 °C: Python ≈ **4.21**, ours ≈ **3.00** kJ/kgK.
  Published syrup cp at that state is ≈ 2.9–3.1 → ours plausible,
  Python's `0.0058·bx/100` term looks like a units slip (~100× too small).
**Verdict: REJECT the Python form.** Do not import.

### 2.4 Crystal specific heat — CONFLICT, UNRESOLVED
- Python: `1.255 + 4.5e-3·T − 2.0e-5·T²` (rising with T).
- Ours: `1.1269 − 4.524e-3·T − 6.24e-6·T²` (falling with T).
- Spot check at 70 °C: Python ≈ 1.47, ours ≈ 0.78 (≈2× apart).
- HB Theory cites Bartens Eq 311/2, but the equation itself is inside
  `HeatContent-2.gif` (not yet transcribed).
**Verdict: UNRESOLVED — goes to UEI-005.** Neither side may claim the
equation until the GIF is transcribed.

### 2.5 Density — CONFLICT, UNRESOLVED
- Python: linear `rho_water + 3.8·bx + 0.02·bx²`.
- Ours: Lyle-1957 pure-sucrose Eq 32.8.
- Neither form found in skill text; Lyle has no located project assignment.
**Verdict: UNRESOLVED — goes to UEI-006.**

### 2.6 Vavrinecz saturation coefficient — OURS STANDS (pending GIF)
- HB Theory text: exponential (`e = 2.71828…`) a/b/c structure; c = 0 →
  Wagnerowski; Wagnerowski valid NSW 1.6–3.5; cane modifies via RS/ash.
- Ours: `Sc = a·NSW + b + (1−b)·e^(c·NSW)` — matches the described structure.
- Python: `Sc = a·e^(b·NSW) + c·NSW` — matches nothing described.
**Verdict: REJECT the Python form.** Exact transcription (GIFs
`SucroseSolubility-2/3`) still required to confirm ours precisely,
including the c = 0 branch constants (ours: stream `a·NSW+b` vs Python's
hardcoded `1.0−0.088·NSW` — do NOT adopt the constants on Python's word).

### 2.7 Supersaturation method — OURS STANDS
- HB names **Van Hook's expression** (mother-liquor sucrose/water ratios at
  same T and NSW) as the official ICUMSA definition — our mother-liquor
  implementation is of this family (method IDs
  `SUGARS_HELPBOOK_*` in code).
- Python uses BPE-ratio SS plus an Eq-17-style critical value with
  1.0/1.15/1.25 zones and UI colors. "Eq 16/17" appear **nowhere** in the
  skill; zone thresholds are unsourced UI conventions.
**Verdict: REJECT the Python method** (`REFERENCE_REQUIRED` if ever revisited).

### 2.8 Our cp default (HUGOT_T_PURITY) and Lyle sourcing — OPEN QUESTIONS
- No Hugot or Lyle material was found in the skill. The brain allows Hugot
  only "where the project explicitly assigns" it — no such assignment was
  located in-repo. This questions neither implementation today, but both
  need a recorded source ruling. Tracked in UEI file.

### 2.9 Station classes, hydrostatic correction, examples, validator
- `JuiceHeater` / `EvaporatorBody` / `VacuumPan`: demo-grade single-effect;
  our station solvers supersede. **No adoption.**
- Hydrostatic-head correction: Pan/Crystallizer/Theory sources searched
  (hydrostatic, head, height, 9.81, depth) — **no backing found** (only
  image-height attributes matched). **Not buildable** under the
  non-invention rule. Tracked as UEI (needs an HB location, another
  approved source, or explicit owner acceptance with review flag).
- Examples reference another project's screenshots, not our data — never
  treat as expected values. `validate_against_sugars` overlaps our V-code
  system at a different layer — no adoption.

---

## 3. Help Book evidence excerpts (short)

- Vavrinecz: *"The solubility of pure sucrose in water is calculated from
  the Vavrinecz equation that is the official equation adopted by the
  ICUMSA"*; saturation coefficient *"from the Vavrinecz function"* with
  `e = log base 2.71828…`; *"Sugars uses the Vavrinecz saturation
  coefficient function for all calculations unless c = 0 is entered; in
  which case, the Wagnerowski equation is used"* (valid NSW 1.6–3.5).
- Supersaturation: *"Supersaturation is defined by Van Hook's expression
  that is the official ICUMSA definition."*
- Heat capacity: *"Specific heat capacity (kJ/kg-K)… for syrups and sucrose
  crystals is calculated from the Sugar Technologists Manual, 8th edition,
  published by Bartens. For syrups the equation (341/3)… for sucrose
  crystals (311/2)…"* (equations in `HeatContent-1/2.gif`, not yet transcribed).
- Cane note: RS/ash-ratio modification of Vavrinecz coefficients is
  HB-described in concept (matches the *idea* of parameterized cane
  coefficients, not any specific numbers).

---

## 4. Owner decisions recorded (not yet executed)

1. **Import parts (selective, not wholesale).** Executes as: `inferBrix…`
   bisection (new, safe — standard numerics on an HB-backed equation) plus
   Wagnerowski/cane forms **parameterized with no defaults** (constants wait
   on GIF-3 transcription). The rejected parts (§2.3 second half, §2.5
   constants, §2.7) stay out.
2. **Adopt 273.15 in Saska.** One-line change + harness transcription update
   + full regression; revert (don't widen tolerance) on any out-of-tolerance
   movement.
3. **Hydrostatic investigated → negative.** Not built; UEI filed.

## 5. Frozen build plan (gated on owner confirmation — nothing run yet)

1. Extract 8 equation GIFs → `docs/stencil/reference/`; transcribe to
   `docs/stencil/formula-registry.md` with IDs (unblocks §2.4–§2.6).
2. Apply 273.15 + harness update + `node tests/run.js` full regression.
3. Add ADR-004-compliant pure functions (bisection inference; parameterized
   Wagnerowski/cane forms post-confirmation) + `tests/properties_crosscheck.js`
   differential harness (IF97 spots, Saska identity, cp three-way table,
   density three-way, Sc forms, NSW definition).
4. File UEI-005 (crystal cp), UEI-006 (density), UEI-007 (Vavrinecz c=0
   branch), UEI-008 (Hugot/Lyle sourcing); update checkpoint/lessons/memory.

## Appendix — anchors- App BPE: `js/main.js` `bpeSaskaASI2002Eq8`, `bpeBatterhamNorgate`,
  `bpeEvaporator`, `bpeEvaporatorRangeWarning`.
- App cp/enthalpy/density: `centHelpbookSyrupCpKJkgK`,
  `centHelpbookSyrupEnthalpy0C`, `densityLyle1957PureSucroseEq32_8`,
  crystal variants, `evaluateSugarSolutionPropertyPackage`.
- App solubility/SS: Vavrinecz block + `calculateMassecuiteAnalysis`
  (method IDs `SUGARS_HELPBOOK_*`).
- Skill: `sugars-helpbook.skill` → `references/Theory/Theory.md`,
  Pan/Crystallizer/Evaporator docs; equation GIFs under `assets/images/`.
- Python reference: Downloads `sugar_properties_module.py` (stays out of repo).

---

## 6. Execution addendum (2026-10-03, working tree — review before merge)

- GIFs: 8 extracted to `docs/stencil/reference/`, transcribed to
  `docs/stencil/formula-registry.md` (`HB-BARTENS-341-3/311-2`,
  `HB-VAVRINECZ-S/SC`, `HB-WAGNEROWSKI`, `HB-VANHOOK-SS`, `HB-RSAT`,
  `HB-SASKA-2002-EQ8`, `XREF-MET-LINEAR-CP`, `HB-MARTINS-2020-CP`
  pending-coefficient-extraction due 2026-10-12).
- 273.15: `js/main.js:9281` + `tests/evap_phase2_smoke.js:47`; full
  `node tests/run.js` green (no revert needed). Line 9258 untouched.
- Pure functions (monolith, strict `p2finStrict` coercion):
  `inferBrixFromBpeSaskaEq8`, `saturationCoefficientWagnerowski`,
  `saturationCoefficientCane` (HB c=0 branch inside),
  `caneVavrineczCoeffsFromRsAsh` — no defaults anywhere.
- `tests/properties_crosscheck.js` registered in `run.js`. Results:
  Saska identity 72/72; S(T) 6/6; bisection round-trips recover W;
  no-defaults enforced; Eq16/Van Hook untouched; steam oracle measured
  (Tsat error up to 22.3K at 10 kPa — claimed band falsified, rejection stands).
- OPEN FOR OWNER REVIEW: 5 cp rows exceed the +/-0.10 gate (30/85, 45/50,
  45/85, 60/50, 60/85; 3 trip the >0.15 Bartens flag) — T-dependent Bartens
  vs T-independent MET-linear, legs 1-2 only; Martins coefficients (due
  2026-10-12) may arbitrate. UEI-006 (density) and UEI-008 (Hugot/Lyle)
  remain OPEN; UEI-009 (hydrostatic) OPEN unbuilt.

## 7. cp-harness with tertiary leg (2026-10-03, working tree — review before merge)

- Martins Eq. 10 pasted byte-exact to `HB-MARTINS-2020-CP` (status active,
  due met early); harness parser reads the owner schema (X in degBrix,
  T in Kelvin; uuid+status asserts; out-of-range NaN guard).
- Gate enforced: FAIL only on Bartens/Martins diffs (>0.10 row fail, >0.15
  FLAG); all Leg-2 pairs log-only per UEI-010 (filed).
- Measured 12-state matrix: 6 rows pass (15/20, 15/50, 15/85, 30/20, 30/50,
  30/85 — three with UEI-010 notes); 6 rows fail, ALL on the T-dependent
  pair: FLAGs at 45/20 (0.150), 60/20 (0.210), 60/50 (0.172); tolerance
  fails at 45/50 (0.131), 45/85 (0.109), 60/85 (0.126).
- Reading: the two temperature-dependent correlations (Bartens industrial
  data vs Martins 2020 fit, R2=0.9875 on its own data) genuinely differ
  above ~30 Bx. Adjudication is an owner decision: accept Martins as
  authoritative (registry note already says so), accept Bartens, or bound
  each to a Brix range. No code preference recorded here.

## 8. Registry single-source-of-truth for all cp legs (2026-10-03)

- `HB-BARTENS-341-3` and `XREF-MET-LINEAR-CP` promoted to machine-readable
  JSON (owner schema shape; Bartens valid_range honestly recorded as "not
  stated on source GIF" with the harness grid as exercised envelope).
- Harness evaluates all three legs from the registry through one parser
  pattern; production engine stays covered by a per-state drift assert
  (registry-Bartens == centHelpbookSyrupCpKJkgK at 1e-12 — 12/12 pass).
- Leg1/Leg3 gate rows unchanged by the rewire (identical values), still
  with owner for adjudication per §7.

## 9. Density 3-leg harness (2026-10-04, v3 spec — review before merge)

- NBS C440 Table 114 PRIMARY (12-state grid + beta method; 85C column kept
  as given with <=1.8 deviation note). Lyle/Rein Eq 32.8 SECONDARY with
  bias note (+8.7 at 30/20, +19.9 at 45/20 measured). MET Brix-SG tertiary
  via IF97 Region-1 water. Martins Eq.10 DEPRECATED (bias-flagged,
  unevaluated). All four machine-readable in registry; production density
  unchanged (monolith NBS-lookup item struck per owner).
- Measured: 12/12 Lyle drift asserts pass; 4 BIAS-WARNING notes, 0 critical,
  0 tertiary advisories; MET tracks Lyle within ~2 (both diverge from NBS
  together at the 4 warning states). Suite green by authority rule.
- UEI-006 RESOLVED (architecture decided + measured). UEI-008 (Hugot/Lyle
  sourcing) and UEI-009 (hydrostatic, unbuilt) remain OPEN.

## 10. UEI-BPE-001 legs (2026-10-04 — review before merge)

- Earlier "KBD unavailable" verdict CORRECTED: Kadlec eq.32 available
  second-hand (Starzak & Peacock 1998); 1978 original still unsighted.
  S&P eq.28 double-sourced (1998 paper + Saska 2002 eq.3).
- Ported to properties_crosscheck.js as oracles + Raoult canary (exact).
  Anchors pass (2-decimal rounding tolerance); cross-leg band scoped
  ws40-80/t0 50-100 enforced; Saska(Q100)/S&P offset worst 1.37 logged
  report-only; canary 0.97 physical floor / 2.5 empirical ceiling commented.
  Blend logic not ported; production BPE untouched; eq.16 stance unchanged.
- Full suite ALL PASS. UEI-BPE-001 filed. Awaiting owner review; no merge.
