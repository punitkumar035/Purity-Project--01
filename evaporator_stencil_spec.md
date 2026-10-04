# Evaporator Stencil: Implementation Spec (for coding agents)

> **Revision 3.** Product-owner decisions folded in: (1) port layout confirmed from the shape figure; (2) Total Solids follows the helpbook: any one effect of a multiple may carry it, max one per multiple (3.5a); (3) Steam Pulp Dryer is only a shape variant, with no special-case logic; (4) strict SUGARS parity, so no BPE controls; (5) Dialog B gets H and DT from a live single-body micro-solve, and shows a message when inlet states are unavailable (6.5). Decisions log: section 10.

**Sources and tags used throughout**

| Tag | Meaning |
|---|---|
| `[SCREEN]` | Read directly off the two SUGARS screenshots (authoritative for UI layout, labels, defaults, units) |
| `[HB]` | SUGARS helpbook (Evaporator Properties / Features / Examples, Theory) |
| `[INFERRED]` | Derived from screenshot numbers or helpbook; verify |
| `[PROPOSED]` | Design decision for our software, not in SUGARS |
| `[OPEN]` | Unknown; needs a decision from the product owner |

---

## 0. Read this first: colour-border meaning

| Border | Meaning `[HB][SCREEN]` |
|---|---|
| **Blue** | Solved thermodynamic state |
| **Magenta** | Member of the **mutually exclusive performance-mode group**. Picking one disables the others |
| **Outlined (neutral)** | Ordinary editable process input |

Magenta does **not** mean "all required". Exactly **one** magenta option must be active per station (see section 4). Valid user input is never shown in red text; red is reserved for error states.

---

## 1. Stencil identity and shapes

- **Stencil name:** Evaporator (one body per stencil). `[HB]`
- **Shape variants, identical calculation:** Robert, Falling Film, Long Tube, Calandria (general), Forced Circulation, **Steam Pulp Dryer**. Only the drawn shape differs. `[HB]`
- **Steam Pulp Dryer** is the same stencil (product-owner decision): wet pulp on `in0`, HP steam on `in1`, identical property window, ports and calculation. It is only another `shapeVariant`. Pump/turbine electricity is not calculated for any variant. `[HB]`
- Per the helpbook the calculations are the same for every variant, so the dryer gets **no special-case logic** (product-owner decision, OQ-8 closed). Known limitation: the section 8 BPE correlations are sucrose-solution models and are applied to the dryer unchanged.
- The stencil is used alone or chained via **Effect Number** into a multiple-effect. `[HB]`

## 2. Ports

| Port | Dir | Content | Cardinality | Can be "required"? |
|---|---|---|---|---|
| `in0` | In | Juice / syrup (wet pulp for dryer) | exactly 1 `[HB]` | n/a |
| `in1` | In | Steam or vapor (drawn red) | exactly 1 `[HB]` | n/a |
| `out0` | Out | Process flow (juice/syrup) | 1 | **Yes.** If required, `in0` becomes required `[HB]` |
| `out1` | Out | Vapor | 1 | **Never** `[HB]` |
| `out2` | Out | Condensate | 1 | **Never** `[HB]` |

**Port layout confirmed (OQ-1 closed)** from the shape figure `EvaporatorFeatures_Fig-1.png` `[SCREEN]`:

| Port | Where drawn | Line colour |
|---|---|---|
| `in1` Steam | left side, mid-height | red |
| `in0` Juice in | bottom, left of centre, arrow pointing up into the body | black |
| `out0` Juice out | bottom, right of centre | black |
| `out1` Vapor | top right, off the vapor head | red |
| `out2` Condensate | right side, lower shell | blue |

This matches the Pan stencil convention (process black, vapor red, condensate blue). Port *numbers* are not printed on the figure; encode the number-to-colour mapping above, which agrees with the helpbook statements for the inputs and `out0`. A small marker on the steam line is unexplained in the figure and is ignored.

Connection rules `[HB]`:
- Pressure of `out0` equals pressure of `out1`.
- Flagging `out1` or `out2` as required is an **over-specification error** (fatal).
- Motive steam of a multiple goes to Effect 1. Juice may enter any effect; more than one juice flow may feed a multiple. Extra steam of known quantity may enter effects other than the first.
- Pressure feedback: the downstream station's (receiver/condenser) pressure is fed back as this body's vapor-out pressure. If the vapor leaves the model, use **model atmospheric pressure** (a model-level setting).

---

## 3. Property window: `EvaporatorProperties` dialog

### 3.1 Window chrome `[SCREEN]`

- Title bar: **Evaporator**
- Yellow banner label: **Evaporator Properties**
- Buttons (right column): **OK**, **Cancel**, **Help**, **Print**, **Units**
- Status bar (3 panels): `Station No.: <n>` | `Model Name: <text>` | `Units: <SI|US>`. All read-only.
- `Units` button opens the model units-system chooser. Changing units re-renders every unit label and converts stored values (store SI internally). `[PROPOSED]`

### 3.2 Control map (exact labels, defaults, formats)

| # | Group | Control id | Label | Type | Unit | Default shown | Border | Enabled when |
|---|---|---|---|---|---|---|---|---|
| 1 | header | `equipmentId` | Equipment ID | text, ≤ **11** chars `[HB]` | | empty | blue | always |
| 2 | header | `stationName` | Station Name | text, ≤ **20** chars `[HB]` | | empty | blue | always |
| 3 | Heat Transfer | `btnCoefficient` | **Coefficient** (button) | button | | | none | always (opens dialog B, section 6) |
| 4 | Heat Transfer | `modeHtcChk` | (checkbox left of U field) | checkbox | | unchecked | **magenta** | always |
| 5 | Heat Transfer | `htcValue` | (grey field, unit label `W/(m²·K)`) | number | W/(m²·K) | grey/empty | **magenta** | `modeHtcChk` = on |
| 6 | Heat Transfer | `heatingSurface` | Heating Surface | number | m² | `0.0` | blue | always enabled `[SCREEN]` |
| 7 | Heat Transfer | `heatLossPct` | Heat Loss | number | % | `0.00` | blue | always |
| 8 | Heat Transfer | `condensateDropK` | Condensate Drop | number | K | `0.0` | blue | always |
| 9 | Effect Number | `effectNo` | (dropdown) | select | | `1 - First Effect` | none | always. Entries `1..N`, N = Evaporator stencils on the sheet (3.5b) |
| 10 | Vapor Out | `modePressureChk` | Pressure (checkbox) | checkbox | | **checked** `[SCREEN]` | **magenta** | always |
| 11 | Vapor Out | `vaporPressure` | (field right of checkbox) | number | see 3.4 | `0.0` | **magenta** | `modePressureChk` = on. Linked to row 13 (3.3a) |
| 12 | Vapor Out | `pressureUnit` | (dropdown) | select | | `kPa` | none | `modePressureChk` = on |
| 13 | Vapor Out | `satTemp` | Saturation Temperature | number | °C | `0.0` | **magenta** | `modePressureChk` = on. Linked to row 11 (3.3a) |
| 14 | Vapor Out | `entrainmentPpm` | Entrainment Sugar Loss | number | mg/kg (ppm) | `0` (integer format) | blue | always |
| 15 | Vapor Out | `modeFeedbackChk` | Pressure Feedback (checkbox) | checkbox | | unchecked | **magenta** | always |
| 16 | Flow Out | `modeFlowTempChk` | Temperature (checkbox) | checkbox | | unchecked | **magenta** | always |
| 17 | Flow Out | `flowOutTemp` | (grey field, unit `°C`) | number | °C | grey/empty | **magenta** | `modeFlowTempChk` = on |
| 18 | Flow Out | `totalSolidsPct` | Total Solids | number | % | `0.00` | blue | always |
| 19 | Flow Out | `colorRise` | Color Rise | number | per 20 | `0.00` | blue | always |
| 20 | Flow Out | `colorRiseUnit` | radio **%** / radio **CU** | radio | | `%` selected | none | always |

Display formats `[SCREEN]`: thousands separator on large values (`2,095.8`); decimals as in the Default column.

### 3.3 The performance-mode group (magenta), exact behaviour

Four checkboxes form **one exclusive group**: `modeHtcChk`, `modePressureChk`, `modeFeedbackChk`, `modeFlowTempChk`.

```
Rule: exactly ONE is on. Turning one on turns the other three off and disables their
      value fields. Turning the active one off is allowed only if another is turned on
      (or block un-checking the last one). [HB: "when one is selected the others are
      not accessible"]
```

| Active mode | Enabled inputs | Disabled/cleared inputs | What the solver treats as known |
|---|---|---|---|
| `HTC` | `htcValue`, `heatingSurface` (both required) | `vaporPressure`, `pressureUnit`, `satTemp`, `flowOutTemp` | U, A. Temperatures float `[HB]` |
| `PRESSURE` (default) | `vaporPressure`+`pressureUnit` **or** `satTemp` | `htcValue`, `flowOutTemp` | Vapor-out Tsat. Juice T = Tsat + BPE |
| `FEEDBACK` | none extra | `vaporPressure`, `satTemp`, `htcValue`, `flowOutTemp` | Pressure taken from downstream station |
| `FLOW_TEMP` | `flowOutTemp` | `htcValue`, `vaporPressure`, `satTemp` | Juice-out T |

`[SCREEN]` default state: `PRESSURE` mode, checked, both fields at `0.0` and therefore **invalid until edited** (see V-05).

### 3.3a Pressure and Saturation Temperature: one linked pair (product-owner confirmed)

Pressure and Saturation Temperature are **one physical quantity shown in two fields** `[HB]`. Both fields are editable whenever `modePressureChk` is on.

- Entering a value in **either** field immediately fills the other from the saturated-water pressure-temperature relationship (IAPWS-IF97 recommended `[PROPOSED]`). No OK or Run is needed for the fill.
- The field the user last typed in is the source; the other is overwritten. The stored state is absolute kPa (3.4).
- Changing `pressureUnit` re-expresses the pressure field in the new unit. `satTemp` does not change.
- Fill runs on commit (Enter, Tab, focus loss), not per keystroke.
- Invalid or empty input in the source field (blank, non-numeric, abs pressure ≤ 0, above the critical point) shows an inline message and sets the partner field back to `0.0`, so V-05 stays raised.
- Helpbook values, usable as tests: 0.5 bar → 81.3 °C, 85.00 °C → 57.9 kPa.
- In the other three modes the pair is disabled (3.3 table). The solved values appear only in the result object (`vaporT_C`, `vaporP_kPa`).

### 3.4 Pressure units and basis

- Dropdown holds exactly **4 entries**: `kPa`, `bar`, `mm Hg`, `in Hg` (OQ-2 closed, product-owner confirmed). Build the list data-driven so entries can be added later without code changes.
- `kPa` / `bar` are **absolute**. `mm Hg` / `in Hg` are **relative to atmosphere**, and values **below atmospheric are entered negative** `[HB]`. So `abs = P_atm(model) + gauge` for those two units.
- Store internally as absolute kPa.

### 3.5 Field semantics

| Field | Meaning | Rule |
|---|---|---|
| `heatLossPct` | Percent of heat given up by the port-1 flow that is lost to ambient (radiation, venting …) `[HB]`. `H_loss = pct/100 × (H_in − H_out)` `[INFERRED, matches screenshot 1 to the unit]` | 0 ≤ x < 100 |
| `condensateDropK` | Condensate leaves this many K **below** the saturation temperature of the entering steam/vapor `[HB]` | ≥ 0 |
| `entrainmentPpm` | mg sucrose per kg of **condensable** vapor. Non-condensables (CO₂, NH₃) excluded `[HB]`. Entrained droplets have the same %DS and purity as the outgoing syrup, so non-sucrose is lost too | ≥ 0 |
| `totalSolidsPct` | Target % total solids leaving this body. `0.00` = **not specified**. If > 0, the steam into Effect 1 of the multiple becomes a **solved (required)** flow `[HB]`. Any one effect of a multiple may carry it (3.5a) | 0, or 0 < x < 100; max one per multiple |
| `colorRise` | Colour gain across the body. `%`: `C_out = C_in × (1 + r/100)`. `CU`: `C_out = C_in + r`. CU system must be consistent across the model `[HB]` | ≥ 0 |
| `effectNo` | Position in the multiple. `1` starts a new multiple | see V-03 and 3.5b. Dropdown size = number of Evaporator stencils on the sheet, N (3.5b) |

### 3.5a Total Solids rule (follows the helpbook)

`totalSolidsPct` is **always enabled**. There is no topology-based enable state. `[HB]`

- `0.00` means "not specified".
- A multiple may carry **at most one** Total Solids entry, on **any** of its effects (first, middle or last). The 6-effect helpbook example sets it on the 6th effect, which is the common usage, but it is not enforced.
- Setting it makes the Effect-1 steam a solved (required) flow for the whole multiple. If none is set anywhere in the multiple, the Effect-1 steam quantity must be given.
- Each body numbered `1 - First Effect` starts its own multiple, so each such body may carry its own Total Solids (Distributors between the bodies, as the helpbook requires).
- A **multiple** is `[PROPOSED]`: order Evaporator stations by station number and take a maximal run whose effect numbers go 1, 2, 3 … n. This definition is used only by V-07.

### 3.5b Effect Number links the bodies (product-owner confirmed)

Bodies are linked into a multiple **only through the Effect Number dropdown** in each station's property window. Flowsheet connections are not used to decide the link.

- 1st Evaporator stencil = `1 - First Effect`, 2nd Evaporator stencil = `2 - Second Effect`, and so on. Choosing consecutive effect numbers on consecutive stencils means the 1st stencil is connected to the 2nd.
- **N = the number of Evaporator stencils on the sheet**, counted by the software. The dropdown offers entries `1..N`. Example: 4 Evaporator stencils on the sheet give entries up to `4 - Fourth Effect`. A single stencil offers `1 - First Effect`.
- The count is read from the current sheet each time the dialog opens.
- **Station number sets the order (product-owner confirmed, agrees with `[HB]`).** Effect numbers must follow station numbers: the body with the lower station number is the earlier effect. Example: stencil A is station 100 and stencil B is station 99. Then B is `1 - First Effect` and A is `2 - Second Effect`, whatever order they were placed on the canvas. Effect no. 1 must always have a lower station number than effect no. 2, and so on. Breaking this order raises V-03.
- Labels are ordinals: `1 - First Effect`, `2 - Second Effect`, `3 - Third Effect` and so on. Data-driven.
- If the stored `effectNo` exceeds the number of entries offered, keep the stored value, flag it as out of range, and raise V-03. Never change it silently.

### 3.6 Fields in the helpbook but NOT on this screen

- **BPE Factor** (`[HB]` lists it under Flow Out) is absent from the screenshot. Product-owner decision: **strict SUGARS parity**. Do not add it, or any BPE model selector, to the window. BPE runs internally with the engine defaults in section 8, and the per-station factor is fixed at 1.0.

---

## 4. Persistent state (JSON)

```jsonc
{
  "stationType": "Evaporator",
  "stationNo": 10,
  "shapeVariant": "Robert|FallingFilm|LongTube|Calandria|ForcedCirculation|SteamPulpDryer",
  "equipmentId": "",            // <= 11 chars
  "stationName": "",            // <= 20 chars, required
  "effectNo": 1,                // integer >= 1, must be within the dropdown entries (3.5b)
  "mode": "PRESSURE",           // HTC | PRESSURE | FEEDBACK | FLOW_TEMP   (exclusive)
  "htc_W_m2K": null,            // active only if mode=HTC
  "heatingSurface_m2": 0.0,
  "heatLossPct": 0.00,
  "condensateDrop_K": 0.0,
  "vaporPressure": { "value": 0.0, "unit": "kPa" },   // stored/converted to abs kPa in solver
  "satTemp_C": 0.0,             // linked to pressure (3.3a); stored as one state, absolute kPa
  "entrainment_mgPerKg": 0,
  "flowOutTemp_C": null,        // active only if mode=FLOW_TEMP
  "totalSolidsPct": 0.00,       // 0 = unspecified
  "colorRise": { "value": 0.00, "unit": "%" }          // "%" | "CU"
  // no BPE fields: engine-internal only (strict SUGARS parity)
}
```

Result object (read-only, filled after balance) `[PROPOSED]`: `evaporation_kgph`, `steamIn_kgph`, `H_in`, `H_out`, `H_loss`, `Q_transferred_kJph`, `DT_K`, `U_calc`, `vaporT_C`, `vaporP_kPa`, `BPE_K`, `juiceOutT_C`, `dsOutPct`, `purityOut`, `crystalsPct`, `supersat`, `colorOut`, `entrainedSucrose_kgph`, `condensateT_C`, `condensateVaporFrac`.

---

## 5. Validation rules

**Fatal (block balance; message shown on Run or on OK where checkable)**

| ID | Rule |
|---|---|
| V-01 | `stationName` non-empty |
| V-02 | Exactly one mode active |
| V-03 | `effectNo` sequence: numbers increase with station number (lower station number = earlier effect, 3.5b); no repeats inside one multiple `[HB]`; and `effectNo` within the entries the dropdown offers (3.5b) |
| V-04 | `mode=HTC` requires `htc > 0` **and** `heatingSurface > 0` `[HB]` |
| V-05 | `mode=PRESSURE` requires a valid pressure (abs > 0) or `satTemp`; the default `0.0` is invalid |
| V-06 | `mode=FLOW_TEMP` requires `flowOutTemp` set, and above the vapor Tsat |
| V-07 | More than one `totalSolidsPct > 0` within one multiple `[HB]` |
| V-08 | Exactly one connection each on `in0` and `in1`; more is an error `[HB]` (pre-flight only — the dialog shows topology as a separate amber note) |
| V-09 | `out1` or `out2` flagged required (over-specified) `[HB]` |
| V-10 | Total Solids target cannot be met with the upstream vapor available `[HB]` (error; ask user to revise Total Solids) |
| V-11 | `mode=PRESSURE` with pressure **and** saturation temperature both empty (dialog fatal; V-05 covers present-but-invalid values) |
| V-12 | Vapor-out saturation temperature of effect *i+1* not lower than effect *i* (warning; pre-flight, reported on the station) |
| V-13 | Driving force `Tsat(in1) − T juice-out` below 2 K at solve time (warning, names the effect) |
| V-14 | Total Solids target owner exists in the multiple (info; Effect-1 steam is a solved flow) |
| V-15 | `mode=HTC` with U or A empty or not positive (dialog fatal; same condition as V-04) |
| V-16 | `mode=FLOW_TEMP` with juice-out temperature empty, or at/below the vapor Tsat (dialog fatal; empty overlaps V-06) |
| V-17 | Equipment ID longer than 11 characters (dialog fatal; input rejects, check is the import backstop) |

**Warnings (balance continues)**

- Steam-starved body (available heat < demanded in HTC mode). Clamp to 100 % condensation and re-solve; if steam is in **excess**, condensate leaves two-phase `[HB]`.
- Juice-in T > juice-out T: flashes. Normal, informational `[HB]`.
- Values outside the validated range of the selected BPE model (section 8).
- Loop not converged.

---

## 6. Dialog B: Heat Transfer Coefficient / Heating Surface calculator `[SCREEN][HB]`

Opened by the **Coefficient** button (control #3).

### 6.1 Layout

- Title: **Heat Transfer Coefficient – Heating Surface Calculations**
- Yellow banner: **Evaporator**
- Left panel:
  - `Heating Surface (A) (m²)`: field (blue-highlighted), example `3,000.0`; button **Calculate Surface** under it
  - `Heat Transfer Coefficient (U) (W/(m²·K))`: field, example `2,095.8`; button **Calculate HTC** under it
- Instruction text: *Enter Heating Surface to get Heat Transfer Coefficient - or - Enter Heat Transfer Coefficient to get Heating Surface*
- Right buttons: **OK**, **Cancel**
- Read-only info block (from the last balance):

```
Calculations are based on the equation:  H = U x A x DT
H  = Heat Transferred from port 1 flow = Hin - Hout - Hloss
   = 216,949,227 - 43,212,662 - 1,737,366  =  171,999,199 kJ/h
DT = Temperature Difference = 8.2 K
DT = Sat. Temp. vapor in - Temp. juice out
```

### 6.2 Behaviour

| Action | Effect |
|---|---|
| Dialog opens | Populate `A` from `heatingSurface`, `U` from `htcValue` if set. Run the **micro-solve** (6.5) to fill H and DT in the info block |
| **Calculate HTC** | Re-run micro-solve if stale, then `U = H / (A × DT)` from the typed A |
| **Calculate Surface** | `A = H / (U × DT)` from the typed U |
| **OK** | Write `heatingSurface` and `htc` back; set `mode = HTC` (checks `modeHtcChk`, disables the other three). This replaces the temperature entry `[HB]` |
| **Cancel** | Discard |

H and DT always come from the micro-solve (6.5); no prior global balance is needed. If the micro-solve cannot run (`NO_INLET_STATE`), disable both Calculate buttons and show the status message.

**Noted deviation (product-owner approved):** Q and DT render as editable fields
for what-if sizing; Scn-2 shows them as display. Reversible — lock to display
on request. The BPE range paragraph is omitted from this dialog (Scn-2 has
none); range warnings still surface in station checks and balance results,
with rounded values.

### 6.3 Equations

```
H_gross  = Hin(port1 steam/vapor) - Hout(condensate out)      [kJ/h]
H_loss   = heatLossPct/100 * H_gross                          [kJ/h]
H        = H_gross - H_loss                                   [kJ/h]
DT       = Tsat(vapor in, at port-1 pressure) - T(juice out)  [K]
Q_W      = H * 1000 / 3600                                    [W]
U        = Q_W / (A * DT)         A = Q_W / (U * DT)
```

- `Tsat(vapor in)` is the saturation temperature of the entering steam/vapor, **not** the condensate temperature. `T(juice out)` is the juice `out0` temperature, i.e. vapor Tsat + BPE. `[HB][SCREEN]`
- Use the same `DT` in the solver when `mode=HTC`: `Q_UA = U × A × (Tsat_in − T_juice_out)`.

### 6.4 Test vector from the screenshot `[INFERRED]`

| Item | Value |
|---|---|
| `Hin` | 216,949,227 kJ/h |
| `Hout` | 43,212,662 kJ/h |
| `Hin − Hout` | 173,736,565 kJ/h |
| `heatLossPct` | 1.00 (gives `Hloss` = 1,737,366 exactly; 173,736,565 × 0.01) |
| `H` | 171,999,199 kJ/h (= 47,777,555 W) |
| `DT` | 8.2 K |
| `A = 3,000.0` → `U` | **1,942.2** W/(m²·K) |
| `U = 2,095.8` → `A` | **≈ 2,780** m² |

**Discrepancy to be aware of:** the screenshot shows A = 3,000.0 together with U = 2,095.8, which do **not** satisfy `H = U·A·DT` (that pair implies DT ≈ 7.6 K). The consistent explanation is that the user typed A = 3,000 but had not yet pressed *Calculate HTC*, so U still reflected the earlier A of ≈ 2,780 m². Code the equation above; do **not** try to reproduce 2,095.8 with A = 3,000. DT is displayed to 1 decimal, so allow about ±0.7 % on the round-trip.

### 6.5 Live micro-solve (product-owner decision)

Dialog B never depends on a completed global balance. It calls `microSolve(station)`, a single-body solve run on demand.

**Inputs**
- `in0` and `in1` stream states, **frozen**: from the last global balance if one exists; otherwise from external-flow definitions when the inlet is directly an external flow; otherwise unavailable.
- This station's current property-window values, including unsaved edits.

**Procedure**
1. Resolve inlet states. If either is unavailable, return `NO_INLET_STATE`.
2. Choose the closure by active mode:
   - `PRESSURE`: Tsat from pressure or `satTemp`.
   - `FEEDBACK`: downstream pressure from the last global balance. If none, use model atmospheric pressure when the vapor leaves the model, else `NO_INLET_STATE`.
   - `FLOW_TEMP`: given juice-out T.
   - `HTC`: solve with the current U and A (both required). Otherwise use the cached H and DT from the last global balance, else `NO_INLET_STATE`. *Calculate* then converts U to A (or A to U) at this same H and DT.
3. Run section 7 steps 1-3, 5-6 for this body only. `totalSolidsPct` is **not enforced** (steam flow frozen at the `in1` value; enforcing it needs the whole multiple).
4. Return `{status, Hin, Hout, Hloss, H, tSatIn, tJuiceOut, DT}`.

**Rules**
- Status codes: `OK`, `NO_INLET_STATE`, `NOT_CONVERGED`, `STEAM_STARVED` (still returns values; flag shown in the dialog).
- Cache by a hash of (inlet states, property values). Recompute on any window edit or new global balance.
- Read-only: must not write to the model. Only **OK** in dialog B writes `heatingSurface`, `htc` and `mode = HTC`.
- Target latency under 100 ms `[PROPOSED]`; same tolerance as the global solver.
- If `totalSolidsPct > 0` and a global balance exists, the inlets come from that balance, so H and DT agree with it. Without one, the frozen `in1` flow may not reproduce the Total Solids target; show a non-blocking note.

---

## 7. Calculation contract (what the solver does with these inputs)

Global: iterate all stations until mass (total, sucrose, non-sucrose) and energy balance close; user-set relative tolerance, typically 0.01 %. Out-of-range flows are reset to 0 on the next pass. `[HB]`

Per body:

1. **Vapor Tsat**
   - `PRESSURE`: from `vaporPressure` or `satTemp`.
   - `FEEDBACK`: from the downstream station's pressure. If the vapor leaves the model, from model atmospheric pressure.
   - `FLOW_TEMP` / `HTC`: found by iteration.
2. **Juice-out T** = vapor Tsat + BPE(DS_out, purity_out, P or T). Iterate because BPE depends on DS_out.
3. **Energy**
   - `H_juice_in + (1 − loss) × Q_steam = H_juice_out + H_vapor + H_entrained`
   - `Q_steam = m_steam × (h_steam_in − h_condensate_out)`
   - `h_condensate_out = h_f(Tsat_steam_in − condensateDropK)`
   - Vapor enthalpy uses total vapor heat including latent, at juice T − BPE.
4. **Mode-specific closure**
   - `HTC`: guess juice-out T, then BPE, then evaporation; compare `H` to `U·A·(Tsat_in − T_out)`; root-find (bracketed secant/Brent) `[PROPOSED]`.
   - `FLOW_TEMP`: given T_out, the evaporation that closes the energy balance.
   - `PRESSURE`/`FEEDBACK`: given steam flow, T_out follows from Tsat and BPE.
   - `totalSolidsPct > 0`: evaporation is fixed by mass balance; outer loop solves the Effect-1 steam flow.
5. **Entrainment**: sucrose loss = `ppm × condensable vapor mass`. Droplet mass = sucrose loss ÷ (DS_out × purity_out). Non-sucrose loss = droplet solids − sucrose.
6. **Crystals**: crystal mass passes through unchanged; no growth. Recompute mother-liquor DS, purity and supersaturation (Vavrinecz/Wagnerowski). `[HB]`
7. **Color**: apply `colorRise` per its unit.
8. **Required-flow propagation**
   - `out0` required → `in0` required.
   - Syrup out of the multiple required → juice into Effect 1 required (solver back-calculates juice). `[HB]`
   - If every body is `effectNo = 1` with its own Total Solids, inter-effect vapor must pass through Distributor stations, or the balance will not close. `[HB]`

---

## 8. BPE model `[PROPOSED]`

SUGARS itself uses Kadlec–Bretschneider–Dandor (1978 original unsighted; eq.32 available second-hand via Starzak & Peacock, Zuckerindustrie 123 (1998) 433–441 — oracle use only, see UEI-BPE-001). For our software provide `bpe(W_ds%, purity%, t_bW°C)` as an **engine-internal function with no UI control** (strict parity, 3.6): always `model="auto"`, `factor=1.0`. Results will differ slightly from SUGARS because the correlation differs, so regression tests should check balance closure and trends, not SUGARS digits. The Steam Pulp Dryer uses the same call with no special-casing (helpbook: calculations are the same for all types). Both cane models below were checked against the source paper (Saska, *Int. Sugar J.* 2002, 104, 500-507).

```python
def bpe_bn(W, Q, t):        # Batterham & Norgate (paper eq 5); valid W 47-84 %, t 40-75 C
    A = 0.3604 - 2.5681e-2*W + 6.8488e-4*W**2 - 8.0158e-6*W**3 + 3.5601e-8*W**4
    B = 50.84 - 3.516*W + 9.122e-2*W**2 - 1.0492e-3*W**3 + 4.611e-6*W**4
    q = Q/100
    C = -0.272 - 2.27*q + 2.542*q**2 + 0.05311*W*(1 - q)
    return A*t + B + C

def bpe_saska(W, Q, t):     # Saska / ASI (paper eq 8); fitted W 65-80 %, t 55-75 C
    return 0.1660*(W/(100-W))**1.1394 * ((273+t)/100)**1.9735 * (Q/100)**0.1237

def bpe(W, Q, t, model="auto", factor=1.0):
    if model == "bn":      v = bpe_bn(W, Q, t)
    elif model == "saska": v = bpe_saska(W, Q, t)
    else:                  v = bpe_bn(W, Q, t) if 47 <= W <= 84 else bpe_saska(W, Q, t)
    return factor * v
```

- `t` is the boiling temperature of **water at the vapor pressure** (use IAPWS Tsat(P)), not the liquor temperature.
- **`bpe_bn` diverges below about 45 % DS** (returns about 20 °C at 15 %). Never call it outside its window without the `auto` fall-back.
- The two models agree within about 0.1 to 1.1 °C at 50 to 80 % DS.
- Both are cane models. Beet needs a different function `[OPEN]`.
- Convert SUGARS-style fractions (DS = 0.65) to percent before calling.
- Warn (non-blocking) when DS or T is outside the selected model's validated range. Optional 47-55 % DS linear cross-fade to avoid a step of roughly 0.5 °C at the switch-over.

---

## 9. Acceptance tests (minimum)

1. **Mode exclusivity**: toggling any of the four magenta checkboxes leaves exactly one on, with the correct fields enabled/greyed per section 3.3.
2. **Default state** matches the screenshot: `PRESSURE` on, `kPa`, all numerics at defaults, effect `1 - First Effect`, colour rise `%`.
3. **Pressure ↔ Tsat**: 0.5 bar → 81.3 °C; 85.00 °C → 57.9 kPa (±0.1).
4. **mm Hg / in Hg** negative input → absolute = atmospheric + gauge.
5. **Dialog B**: test vector in 6.4 (`U = 1942.2` for A = 3000; `A ≈ 2780` for U = 2095.8). OK writes back and switches the station to `HTC`. With **no prior global balance** but defined inlets, H and DT still fill via micro-solve; with undefined inlets the dialog shows `NO_INLET_STATE` and disables both Calculate buttons. Cancel changes nothing in the model.
6. **Validation**: each V-xx triggers with the specified message; V-09 fires when `out1` or `out2` is flagged required.
7. **Total Solids**: enabled on every body. Setting it on any one body of a multiple (first, middle or last) makes Effect-1 steam a solved flow. A second Total Solids in the same multiple raises V-07. Bodies each numbered `1 - First Effect` may each carry their own.
8. **Regression**: the helpbook 4-effect example (HTC + heating surface on every effect, bleeds 25,000 / 30,000 / 20,000 kg/h on vapors 1/2/3, flash tanks with pressure feedback) balances and the bleed temperatures float with load.
9. **Steam Pulp Dryer** shape uses the same property window, ports and solver path as the other variants.
10. **Parity**: the window shows no BPE model or BPE Factor controls.

---

## 10. Decisions log and remaining open questions

**Closed**

| ID | Decision |
|---|---|
| OQ-1 | `out0` juice (black), `out1` vapor (red), `out2` condensate (blue), per the shape figure |
| OQ-3 | `0.00` = not specified; Total Solids follows the helpbook (see OQ-7) |
| OQ-4 | Steam Pulp Dryer is the same stencil (`shapeVariant` only) |
| OQ-5 | Strict SUGARS parity; no BPE controls |
| OQ-6 | Dialog B uses a live micro-solve |
| OQ-7 | Total Solids: **go with the helpbook**. Any one effect of a multiple, max one per multiple, always enabled |
| OQ-8 | Steam Pulp Dryer: **go with the helpbook only**. No special-case BPE or other logic |
| OQ-9 | Micro-solve with no inlet state and no global balance: **show a message** (`NO_INLET_STATE`), no auto-run of the upstream flowsheet |
| OQ-2 | Pressure units: `kPa`, `bar`, `mm Hg`, `in Hg` (4 entries, data-driven). Vapor Out Pressure and Saturation Temperature are one linked pair, either fills the other (3.3a). Effect Number: dropdown holds `1..N`, N = Evaporator stencils on the sheet; bodies are linked by Effect Number only (3.5b) |

**Still open**

None.
