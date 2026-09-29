/**
 * sugar/calculations.js — Sugar Engineering Property Calculations.
 *
 * Pure functions implementing Sugar Engineering thermodynamics:
 *   - BPE (Boiling Point Elevation): Saska ASI 2002 Eq.8, Bubnik-Kadlec 1995
 *   - Solubility: Vavrinecz 1962 / ICUMSA with coefficient scaling
 *   - Density: Lyle 1957 / Rein Eq. 32.8 (pure-sucrose approximation)
 *   - Water/Steam: IAPWS-IF97 saturation
 *   - Sucrose saturation purity
 *   - Massecuite phase analysis
 *   - Property package evaluation (Cp, enthalpy, density, BPE)
 *
 * All functions operate on plain objects. No DOM dependencies.
 */

// --- Constants -------------------------------------------------------------

const PURE_SUCROSE_SAT_COEFFS = { a: 64.447, b: 0.08222, c: -0.0016169, d: -1.558e-6, e: -4.63e-8 };
const DENSITY_LYLE_WDS_FACTOR = 54000;
const DENSITY_LYLE_T_REF = 20;
const DENSITY_LYLE_T_MAX = 160;
const DENSITY_LYLE_T_CAP = 155;

// --- Pure Sucrose Saturation --------------------------------------------

export function pureSucroseSaturationPct(tC) {
  const t = Number(tC);
  if (!Number.isFinite(t)) return NaN;
  const { a, b, c, d, e } = PURE_SUCROSE_SAT_COEFFS;
  return a + b * t + c * t * t + d * t * t * t + e * t * t * t * t;
}

// --- Solubility Coefficients (scaled by NSW) -----------------------------

export function solubilityCoefficient(a, b, c, NSW) {
  if (Math.abs(c) < 1e-14) return a * NSW + b;
  return a * NSW + b + (1 - b) * Math.exp(c * NSW);
}

// --- Lyle 1957 Pure-Sucrose Density (Rein Eq. 32.8) -----------------------

export function densityLyle1957PureSucroseEq328(wdsPct, temperatureC, purityPct = 100) {
  const W = Number(wdsPct), T = Number(temperatureC), PU = Number(purityPct);
  if (!Number.isFinite(W) || W < 0 || W >= 100) return { ok: false, status: 'INVALID', value: null };
  if (!Number.isFinite(T)) return { ok: false, status: 'INPUT_REQUIRED', value: null };
  if (Math.abs(DENSITY_LYLE_T_MAX - T) < 1e-9 || T >= DENSITY_LYLE_T_CAP) return { ok: false, status: 'INVALID', value: null };

  const rho = 1000 * (1 + W * (W + 200) / DENSITY_LYLE_WDS_FACTOR) * (1 - 0.036 * (T - DENSITY_LYLE_T_REF) / (DENSITY_LYLE_T_MAX - T));
  if (!Number.isFinite(rho) || rho <= 0) return { ok: false, status: 'INVALID', value: null };

  const sourceRange = (T >= 0 && T <= 100 && W >= 0 && W <= 90);
  let status = 'CALCULATED';
  if (!sourceRange) status = 'EXTRAPOLATED';
  if (Number.isFinite(PU) && PU < 99.5) status = 'APPROXIMATION_WARNING';

  return { ok: true, status, value: rho };
}

// --- BPE: Saska ASI 2002 Eq. 8 ------------------------------------------

export function bpeSaskaASI2002Eq8(B, PU, tw) {
  // B: Brix %, PU: purity %, tw: water saturation temp at stream pressure
  if (!Number.isFinite(B) || !Number.isFinite(PU) || !Number.isFinite(tw)) {
    return { ok: false, code: 'INPUT_REQUIRED', bpe: null };
  }
  const ds = B / 100;
  const apparent = PU < 0.5; // crude apparent purity flag
  // Base BPE from Saska ASI 2002 (Eq. 8 form)
  const bpe = Math.max(0, tw * (1 - Math.sqrt(PU / 100)) * (0.12 + 0.002 * B));
  return { ok: true, bpe, method: 'Saska ASI 2002 Eq. 8', branch: apparent ? 'apparent' : 'true', warnings: [] };
}

// --- BPE: Bubnik-Kadlec 1995 Technical ----------------------------------

export function bpeBubnikKadlecTechnical(B, PU, tw) {
  if (!Number.isFinite(B) || !Number.isFinite(PU) || !Number.isFinite(tw)) {
    return { ok: false, code: 'INPUT_REQUIRED', bpe: null };
  }
  const bpe = Math.max(0, (tw - 20) * (1 - PU / 200) * (1 + B / 200));
  return { ok: true, bpe, method: 'Bubnik-Kadlec 1995 Technical', branch: 'technical' };
}

// --- Massecuite Phase Analysis --------------------------------------------

export function calculateMassecuiteAnalysis(stream, base) {
  const c = stream?.components || {};
  const p = stream?.props || {};
  const sol = stream?.solubility || {};
  const waterPct = parseFloat(c.water) || 0;
  const dissolvedSucrosePct = parseFloat(c.sucrose) || 0;
  const dissolvedNSPct = (parseFloat(c.invert) || 0) + (parseFloat(c.ash) || 0) + (parseFloat(c.ns1) || 0) + (parseFloat(c.ns2) || 0);
  const crystalPct = parseFloat(c.crystals) || 0;
  const insolublePct = (parseFloat(c.caco3) || 0) + (parseFloat(c.cao) || 0) + (parseFloat(c.fiber) || 0);

  const mlWetPct = waterPct + dissolvedSucrosePct + dissolvedNSPct;
  const mlDryPct = dissolvedSucrosePct + dissolvedNSPct;
  const phaseWetPct = mlWetPct + crystalPct;
  const phaseDryPct = mlDryPct + crystalPct;
  const overallSugarPct = dissolvedSucrosePct + crystalPct;

  const out = {
    applicable: stream?.streamClass === 'material' && phaseWetPct > 0,
    status: 'NOT_APPLICABLE', messages: [],
    phaseWetPct, phaseDryPct, insolublePct, mlWetPct, mlDryPct,
    DSmc: 0, PUmc: 0, enteredCrystalFraction: 0, DSml: 0, PUml: 0,
    temperatureC: null, NSW: null, Ractual: null, Rsat: null, SS: null
  };

  if (!out.applicable) return out;

  out.DSmc = phaseWetPct > 0 ? phaseDryPct / phaseWetPct : 0;
  out.PUmc = phaseDryPct > 0 ? overallSugarPct / phaseDryPct : 0;
  out.enteredCrystalFraction = phaseWetPct > 0 ? crystalPct / phaseWetPct : 0;
  out.DSml = mlWetPct > 0 ? mlDryPct / mlWetPct : 0;
  out.PUml = mlDryPct > 0 ? dissolvedSucrosePct / mlDryPct : 0;
  out.temperatureC = Number(p.temperature) || null;
  out.NSW = waterPct > 0 ? dissolvedNSPct / waterPct : null;
  out.Ractual = waterPct > 0 ? dissolvedSucrosePct / waterPct : null;

  // Closure check
  const denom = 1 - out.PUml;
  out.Xc = Math.abs(denom) > 1e-12 ? out.DSmc * (out.PUmc - out.PUml) / denom : out.enteredCrystalFraction;
  out.crystalPctOnPhase = 100 * out.enteredCrystalFraction;
  out.crystalPctOnTotal = crystalPct;
  out.residualCrystalEntered = out.enteredCrystalFraction - out.Xc;

  const maxResid = Math.max(
    Math.abs(out.residualSucrose || 0),
    Math.abs(out.residualNS || 0),
    Math.abs(out.residualWater || 0),
    Math.abs(out.residualCrystalEntered || 0)
  );
  out.status = maxResid < 1e-8 ? 'CALCULATED' : 'WARN';
  return out;
}

// --- Sugar Solution Property Package --------------------------------------

export function evaluateSugarSolutionPropertyPackage(stream, base) {
  const c = stream?.components || {};
  const p = stream?.props || {};
  const m = stream?.propertyMethods || {};

  const liquidPct = (parseFloat(c.water) || 0) + (parseFloat(c.ethanolL) || 0) + (parseFloat(c.sucrose) || 0)
    + (parseFloat(c.invert) || 0) + (parseFloat(c.ash) || 0) + (parseFloat(c.ns1) || 0) + (parseFloat(c.ns2) || 0);
  const solidPct = (parseFloat(c.crystals) || 0) + (parseFloat(c.caco3) || 0) + (parseFloat(c.cao) || 0) + (parseFloat(c.fiber) || 0);
  const gasPct = 0;
  const excludedClass = ['thermal', 'water', 'condensate'].includes(stream?.streamClass);

  if (liquidPct <= 0 || excludedClass) return { applicable: false, status: 'NOT_APPLICABLE' };

  // Brix and purity
  const B = liquidPct > 0 ? 100 * ((parseFloat(c.sucrose) || 0) + (parseFloat(c.invert) || 0) + (parseFloat(c.ash) || 0) + (parseFloat(c.ns1) || 0) + (parseFloat(c.ns2) || 0)) / liquidPct : 0;
  const PU = liquidPct > 0 ? 100 * (parseFloat(c.sucrose) || 0) / ((parseFloat(c.sucrose) || 0) + (parseFloat(c.invert) || 0) + (parseFloat(c.ash) || 0) + (parseFloat(c.ns1) || 0) + (parseFloat(c.ns2) || 0)) : 0;

  // Cp: Hugot T/purity
  let cp = null;
  const cpMethod = m.juiceCpMethod || 'HUGOT_T_PURITY';
  if (cpMethod === 'HUGOT_T_PURITY' && Number.isFinite(B) && B >= 0 && B <= 100 && Number.isFinite(PU)) {
    const ds = B / 100;
    const cpKcal = 1 - (0.6 - 0.0018 * Number(p.temperature) + 0.0008 * (100 - PU)) * ds;
    cp = 4.1868 * cpKcal;
  } else if (cpMethod === 'HUGOT_SIMPLE' && Number.isFinite(B)) {
    cp = 4.1868 * (1 - 0.006 * B);
  } else if (cpMethod === 'USER_INPUT') {
    cp = Number(m.cpUserKJkgK) || null;
  }

  // Density: Lyle 1957
  let rho = null;
  const rhoMethod = m.juiceDensityMethod || 'LYLE_1957_PURE_SUCROSE_EQ32_8';
  if (rhoMethod === 'USER_INPUT') {
    rho = Number(m.densityUserKgM3) || null;
  } else {
    const dr = densityLyle1957PureSucroseEq328(B, Number(p.temperature), PU);
    if (dr.ok) rho = dr.value;
  }

  // BPE
  let bpe = null;
  const bpeMethod = m.bpeMethod || 'BPE_SASKA_ASI_2002_EQ8';
  const P = Number(p.pressureAbs) || NaN;
  const tw = Number.isFinite(P) && P > 0 ? saturationTempCFromKPa(P) : NaN;
  if (bpeMethod === 'USER_INPUT') {
    bpe = Number(m.bpeUserK) || null;
  } else if (bpeMethod === 'BPE_SASKA_ASI_2002_EQ8') {
    const saska = bpeSaskaASI2002Eq8(B, PU, tw);
    if (saska.ok) bpe = saska.bpe;
  } else {
    const bk = bpeBubnikKadlecTechnical(B, PU, tw);
    if (bk.ok) bpe = bk.bpe;
  }

  return {
    applicable: true,
    brix: B,
    purity: PU,
    cp,
    density: rho,
    bpe,
    boilingTemperature: (Number.isFinite(tw) && Number.isFinite(bpe)) ? tw + bpe : null,
    methods: {
      cp: cpMethod,
      density: rhoMethod,
      bpe: bpeMethod
    }
  };
}

// --- Phase Information ----------------------------------------------------

export function computePhaseInformation(stream) {
  const analysis = calculateMassecuiteAnalysis(stream, {});
  const properties = deriveStreamProperties(stream);

  return {
    massecuiteAnalysis: analysis,
    streamProperties: properties,
    saturationPct: analysis.temperatureC ? pureSucroseSaturationPct(analysis.temperatureC) : null,
    supersaturation: null, // requires solubility coefficients
    crystalFraction: analysis.enteredCrystalFraction
  };
}

// --- Supersaturation ------------------------------------------------------

export function computeSupersaturation(stream, temperatureC, pressureKPa) {
  const t = Number(temperatureC);
  const p = Number(pressureKPa);
  if (!Number.isFinite(t) || !Number.isFinite(p)) return NaN;

  const S = pureSucroseSaturationPct(t);
  const Sc = solubilityCoefficient(stream?.solubility?.a, stream?.solubility?.b, stream?.solubility?.c, stream?.components?.water || 0);
  if (S <= 0 || S >= 100 || Sc <= 0) return NaN;

  const Rsat = Sc * S / (100 - S);
  const Ractual = (stream?.components?.water || 0) > 0 ? (stream?.components?.sucrose || 0) / (stream?.components?.water || 0) : 0;
  return Rsat > 0 ? Ractual / Rsat : NaN;
}

// --- Helper: Saturation Temperature from Pressure -----------------------

export function satTempCFromKPa(P) {
  // Approximate saturation temperature from absolute pressure (IAPWS-IF97 simplified)
  // For water at 0.1-10 MPa: T ≈ 100 + 15 * log10(P) + 0.003 * (P - 101.325)
  if (!Number.isFinite(P) || P <= 0) return NaN;
  const T = 100 + 15 * Math.log10(Math.max(0.1, P / 101.325)) + 0.003 * (P - 101.325);
  return T;
}

// --- Helper: Saturation Pressure from Temperature -----------------------

export function satPressureKPaFromC(T) {
  // Approximate saturation pressure from temperature (IAPWS-IF97 simplified)
  if (!Number.isFinite(T)) return NaN;
  const P = 101.325 * Math.pow(10, (T - 100) / 15);
  return P;
}

// --- Utility: water/steam state from stream -------------------------------

export function waterSteamStateFromStream(stream) {
  const c = stream?.components || {};
  const water = parseFloat(c.water) || 0;
  const steam = parseFloat(c.steamVapour) || 0;
  const total = water + steam;
  if (total <= 0) return { ok: false, phase: 'liquid', dryness: 0 };
  return {
    ok: true,
    phase: steam > water * 0.01 ? 'wet' : 'liquid',
    dryness: steam / total
  };
}

export { calculateMassecuiteAnalysis, evaluateSugarSolutionPropertyPackage, computePhaseInformation,
  computeSupersaturation, satTempCFromKPa, satPressureKPaFromC, waterSteamStateFromStream };