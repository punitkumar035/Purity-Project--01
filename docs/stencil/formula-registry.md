# Formula registry — Help Book transcriptions

Visual transcriptions of equation GIFs extracted from `sugars-helpbook.skill`
(`sugars-helpbook/assets/images/Theory/`) to `docs/stencil/reference/`.
Each entry: ID, image, transcription, code anchor, status.
`UNVERIFIED` means transcribed but not yet numerically cross-checked.

## HB-BARTENS-341-3 — syrup specific heat (primary cp leg)
- image: `reference/HeatContent-1.gif`
- transcription: `Cps = 4.1868 − DS·(0.0297 − 4.6·10⁻³) + 7.5·10⁻⁵·DS·t`
  (DS in %, t in °C, result kJ/kg·K)
- code: `centHelpbookSyrupCpKJkgK` — MATCHES VERBATIM.
- status: CONFIRMED (resolves UEI-005 syrup half; Python linear form rejected).
- cross-check ruling (UEI-010, 2026-10-03): above 30 Bx the harness accepts
  Martins Eq. 10 as authoritative; production use of this equation continues.
- machine-readable:
  ```json
  {
    "uuid": "HB-BARTENS-341-3",
    "description": "Specific heat capacity (Cps) of sugar syrups via Bartens Sugar Technologists Manual 8th ed., Eq. 341/3",
    "property": "specific-heat",
    "solute": "sucrose",
    "source": {
      "authors": "Bartens (Sugar Technologists Manual, 8th ed.)",
      "equation_ref": "341/3",
      "gif": "reference/HeatContent-1.gif"
    },
    "equation": {
      "form": "Cps = base - DS*(ds_lin - ds_const) + ds_t*DS*t",
      "variables": {
        "Cps": {"unit": "kJ·kg⁻¹·K⁻¹", "description": "syrup specific heat capacity"},
        "DS": {"unit": "%", "description": "dry substance, mass percent"},
        "t": {"unit": "°C", "description": "temperature"}
      },
      "coefficients": {
        "base": {"value": 4.1868, "unit": "kJ·kg⁻¹·K⁻¹"},
        "ds_lin": {"value": 0.0297, "unit": "kJ·kg⁻¹·K⁻¹·%⁻¹"},
        "ds_const": {"value": 0.0046, "unit": "kJ·kg⁻¹·K⁻¹·%⁻¹"},
        "ds_t": {"value": 0.000075, "unit": "kJ·kg⁻¹·K⁻¹·%⁻¹·°C⁻¹"}
      }
    },
    "valid_range": {
      "note": "not stated on source GIF; exercised envelope below is harness grid, not an authority claim",
      "DS": {"min": 15, "max": 60, "unit": "%"},
      "t": {"min": 20, "max": 85, "unit": "°C"}
    },
    "harness": {
      "role": "primary",
      "status": "active",
      "tolerance_kJ_kg_K": 0.10,
      "temperature_grid_C": [20, 50, 85],
      "brix_grid": [15, 30, 45, 60]
    },
    "adr_reference": "ADR-004"
  }
  ```

## HB-BARTENS-311-2 — crystal specific heat
- image: `reference/HeatContent-2.gif`
- transcription: `Cpc = 1.1269 − 4.524·10⁻³·t − 6.24·10⁻⁶·t²`
- code: `centHelpbookCrystalCpKJkgK` — MATCHES VERBATIM.
- status: CONFIRMED (resolves UEI-005; Python rising-T form rejected).

## HB-VAVRINECZ-S — pure-sucrose solubility
- image: `reference/SucroseSolubiliby-1.gif` (source filename typo preserved)
- transcription: `S = 64.447 + 0.08222·t − 0.0016169·t² − 1.558·10⁻⁶·t³ − 4.63·10⁻⁸·t⁴`
  (S in wt%, t in °C)
- code: `pureSucroseSaturationPct` — MATCHES VERBATIM.
- status: CONFIRMED.

## HB-VAVRINECZ-SC — impurity saturation coefficient
- image: `reference/SucroseSolubility-2.gif`
- transcription: `Sc = a·NSW + b + (1−b)·e^(c·NSW)`
- code: Vavrinecz block (`Sc=a·NSW+b+(1−b)·exp(c·NSW)`) — MATCHES VERBATIM.
- status: CONFIRMED (Python `a·e^(b·NSW)+c·NSW` rejected).

## HB-WAGNEROWSKI — c=0 branch
- image: `reference/SucroseSolubility-3.gif`
- transcription: `Sc = a·NSW + b` (a,b are the stream's coefficients)
- code: c≈0 branch (`sol.a*NSW+sol.b`) — MATCHES VERBATIM.
- note: Python's hardcoded `1.0−0.088·NSW` is one factory's a/b pair, NOT the
  equation. Never adopt those constants as defaults.
- status: CONFIRMED (resolves UEI-007).

## HB-VANHOOK-SS — supersaturation (primary method)
- image: `reference/SucroseSolubility-4.gif`
- transcription: `Ss = (sucrose/water)_sample / (sucrose/water)_saturation`
  at same T and same NSW.
- code: mother-liquor relations (`Rsat`, `Rml`, `SS`) — SAME FAMILY.
- status: CONFIRMED as primary (BPE-ratio SS stays alternative field method).

## HB-RSAT — saturated sucrose/water ratio
- image: `reference/SucroseSolubility-6.gif`
- transcription: `(sucrose/water)_saturation = Sc·(S/(100−S))`
- code: `Rsat=Sc*S/(100-S)` — MATCHES VERBATIM.
- status: CONFIRMED.

## HB-SASKA-2002-EQ8 — BPE (paper source, no GIF)
- form: `BPE = 0.1660·(W/(100−W))^1.1394·((273.15+t)/100)^1.9735·(Q/100)^0.1237`
- source: Saska, Int. Sugar J. 2002, 104(1247), 500–507, Eq. 8.
- note: absolute-temperature base adopted as 273.15 per owner decision
  (was 273 in earlier transcription).
- status: ACTIVE.

## XREF-MET-LINEAR-CP — secondary cp leg (owner-supplied)
- form: `Cp = 4.18 − 2.35·xs` (xs = solids mass fraction), kJ/kg·K.
- source: MyEngineeringTools linear model (owner-supplied, no HB claim).
- grid: 15/30/45/60 Brix × 20/50/85 °C.
- status: ACTIVE.
- machine-readable:
  ```json
  {
    "uuid": "XREF-MET-LINEAR-CP",
    "description": "Specific heat capacity (Cp) of sugar solutions via MyEngineeringTools linear model (temperature-independent)",
    "property": "specific-heat",
    "solute": "sucrose",
    "source": {
      "authors": "MyEngineeringTools (owner-supplied, no Help Book claim)"
    },
    "equation": {
      "form": "Cp = base - slope*xs",
      "note": "Temperature-independent by construction; divergence vs T-dependent legs at high T/Bx is structural (UEI-010).",
      "variables": {
        "Cp": {"unit": "kJ·kg⁻¹·K⁻¹", "description": "solution specific heat capacity"},
        "xs": {"unit": "mass fraction", "description": "solids mass fraction (Brix/100)"}
      },
      "coefficients": {
        "base": {"value": 4.18, "unit": "kJ·kg⁻¹·K⁻¹"},
        "slope": {"value": 2.35, "unit": "kJ·kg⁻¹·K⁻¹"}
      }
    },
    "valid_range": {
      "note": "owner-specified harness grid",
      "brix_grid": [15, 30, 45, 60]
    },
    "harness": {
      "role": "secondary",
      "status": "active",
      "temperature_grid_C": [20, 50, 85],
      "brix_grid": [15, 30, 45, 60]
    },
    "adr_reference": "ADR-004"
  }
  ```

## HB-MARTINS-2020-CP — tertiary cp leg (owner-pasted 2026-10-03, ACTIVE)
- status: active
- due: 2026-10-12 (met early; retained as record)
- doi: 10.1111/jfpe.13483
- range: { brix: [10, 60], tempC: [0, 85] }
- polynomial:
  ```json
  {
    "uuid": "HB-MARTINS-2020-CP",
    "description": "Specific heat capacity (cp) of sucrose solutions via Martins et al. (2020) Equation (10)",
    "property": "specific-heat",
    "solute": "sucrose",
    "source": {
      "authors": "Martins, M. J. N., Guimarães, B., Polachini, T. C., & Telis-Romero, J.",
      "year": 2020,
      "title": "Thermophysical properties of carbohydrate solutions: Correlation between thermal and transport properties",
      "journal": "Journal of Food Process Engineering",
      "volume": "43",
      "issue": "9",
      "pages": "e13483",
      "doi": "10.1111/jfpe.13483"
    },
    "equation": {
      "form": "cp = a + b*X + d*T + f*X*T",
      "note": "Equation (10), generic empirical model using significant (p < 0.05) linear parameters. Terms c*X^2 and e*T^2 were not statistically significant for sucrose cp and are omitted.",
      "variables": {
        "cp": {"unit": "kJ·kg⁻¹·K⁻¹", "description": "specific heat capacity"},
        "X": {"unit": "°Brix", "description": "solute concentration"},
        "T": {"unit": "K", "description": "absolute temperature"}
      },
      "coefficients": {
        "a": {"value": 3.78, "unit": "kJ·kg⁻¹·K⁻¹"},
        "b": {"value": -0.0290, "unit": "kJ·kg⁻¹·K⁻¹·°Brix⁻¹"},
        "d": {"value": 0.00129, "unit": "kJ·kg⁻¹·K⁻²"},
        "f": {"value": 0.0000320, "unit": "kJ·kg⁻¹·K⁻¹·°Brix⁻¹·K⁻¹"}
      },
      "goodness_of_fit": {
        "R_squared": 0.9875,
        "MRE_percent": 0.60
      }
    },
    "valid_range": {
      "X": {"min": 10, "max": 60, "unit": "°Brix"},
      "T": {"min": 273.15, "max": 358.15, "unit": "K"}
    },
    "harness": {
      "role": "tertiary",
      "status": "active",
      "pending_expires": "2026-10-12T23:59:59Z",
      "tolerance_kJ_kg_K": 0.10,
      "temperature_grid_C": [20, 50, 85],
      "brix_grid": [15, 30, 45, 60],
      "model_comparison_note": "MyEngineeringTools linear model (Leg 2) is temperature-independent. Divergence > 0.10 vs Martins at high T is expected and acceptable. Use Martins as authoritative for temperature-dependent cp."
    },
    "adr_reference": "ADR-004"
  }
  ```
