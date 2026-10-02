// Harness: evaporator Phase-2 BPE engine (real extracted code + IAPWS).
const fs = require('fs');
const SRC = require('path').join(__dirname, '..', 'js', 'main.js');
const src = fs.readFileSync(SRC, 'utf8');

function balancedSlice(s, openIdx) {
  let d = 0, inStr = null;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d === 0) return s.slice(openIdx, i + 1); }
  }
  throw new Error('unbalanced');
}

// p2num (real)
{
  const a = src.indexOf('function p2num(v){');
  const b = src.indexOf('function p2clamp');
  eval(src.slice(a, b));
}
// IAPWS saturation pair + coeffs
{
  const a = src.indexOf('const IAPWS4 = {');
  const b = src.indexOf('// IAPWS-IF97 common service');
  eval(src.slice(a, b));
}
// existing Saska Eq8 + new evaporator BPE block (through range warning)
{
  const a = src.indexOf('function bpeSaskaASI2002Eq8(');
  const b = src.indexOf('function supersaturationFromBpeSaskaASI2002Eq16(');
  eval(src.slice(a, b));
}

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const approx = (a, b, tol, msg) => {
  const good = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  if (!good) { console.log('FAIL:', msg, 'got', a, 'want ~', b); fail++; }
  else console.log('ok:', msg);
};

// Independent second transcriptions, written straight from the spec text.
const specSaska = (W, Q, t) =>
  0.1660 * Math.pow(W / (100 - W), 1.1394) * Math.pow((273 + t) / 100, 1.9735) * Math.pow(Q / 100, 0.1237);
const specBn = (W, Q, t) => {
  const A = 0.3604 - 2.5681e-2 * W + 6.8488e-4 * W * W - 8.0158e-6 * W * W * W + 3.5601e-8 * W * W * W * W;
  const B = 50.84 - 3.516 * W + 9.122e-2 * W * W - 1.0492e-3 * W * W * W + 4.611e-6 * W * W * W * W;
  const q = Q / 100;
  const C = -0.272 - 2.27 * q + 2.542 * q * q + 0.05311 * W * (1 - q);
  return A * t + B + C;
};

// A. Transcription agreement across the operating grid
for (const W of [50, 60, 70, 80]) for (const Q of [70, 85, 100]) for (const t of [55, 65, 75]) {
  const r = bpeSaskaASI2002Eq8(W, Q, t);
  if (!r.ok || Math.abs(r.bpe - specSaska(W, Q, t)) > 1e-12) { console.log('FAIL: saska transcription', W, Q, t); fail++; }
  if (Math.abs(bpeBatterhamNorgate(W, Q, t) - specBn(W, Q, t)) > 1e-12) { console.log('FAIL: bn transcription', W, Q, t); fail++; }
}
console.log('ok: independent transcription agreement (2x27 grid points)');

// B. Spec agreement band: bn vs saska within ~1.1 C at 50-80% DS
for (const W of [50, 60, 70, 80]) {
  const d = Math.abs(bpeBatterhamNorgate(W, 85, 65) - specSaska(W, 85, 65));
  if (!(d <= 1.2)) { console.log('FAIL: agreement band at W=' + W, d); fail++; }
}
console.log('ok: bn/saska agreement band');

// C. Auto leg selection + default
eq0(bpeEvaporatorModelFor(46.9), 'saska', 'auto leg below 47');
function eq0(a, b, m) { ok(a === b, m + ` (${a})`); }
eq0(bpeEvaporatorModelFor(47), 'bn', 'auto leg at 47');
eq0(bpeEvaporatorModelFor(84), 'bn', 'auto leg at 84');
eq0(bpeEvaporatorModelFor(84.1), 'saska', 'auto leg above 84');
approx(bpeEvaporator(70, 85, 65), bpeBatterhamNorgate(70, 85, 65), 0, 'default uses bn in window');
approx(bpeEvaporator(40, 85, 65), specSaska(40, 85, 65), 1e-12, 'default uses saska outside window');
approx(bpeEvaporator(70, 85, 65, 'saska'), specSaska(70, 85, 65), 1e-12, 'explicit saska');
approx(bpeEvaporator(70, 85, 65, 'bn'), specBn(70, 85, 65), 1e-12, 'explicit bn');

// D. Factor
approx(bpeEvaporator(70, 85, 65, 'auto', 2.0), 2 * bpeEvaporator(70, 85, 65), 1e-12, 'factor scales');
approx(bpeEvaporator(70, 85, 65, 'auto', ''), bpeEvaporator(70, 85, 65), 0, 'blank factor -> 1.0');

// E. Range warnings
ok(bpeEvaporatorRangeWarning(70, 85, 65) === null, 'in-window: no warning');
ok(/DS 90/.test(bpeEvaporatorRangeWarning(90, 85, 65) || ''), 'W out of window warns');
ok(/temperature 40/.test(bpeEvaporatorRangeWarning(70, 85, 40, 'saska') || ''), 'T out of window warns');
ok(/DS 40/.test(bpeEvaporatorRangeWarning(40, 85, 65) || ''), 'auto low-DS warns via saska leg');

// F. Monotonicity (physical direction)
ok(bpeEvaporator(75, 85, 65) > bpeEvaporator(65, 85, 65), 'BPE rises with DS');
ok(bpeEvaporator(70, 70, 65) > bpeEvaporator(70, 90, 65), 'BPE falls with purity');

// G. BN divergence guard: auto never serves the blown-up branch
const autoLow = bpeEvaporator(15, 85, 60);
const directLow = bpeBatterhamNorgate(15, 85, 60);
ok(Number.isFinite(autoLow) && autoLow < 10, `auto at 15% DS finite and sane (${autoLow.toFixed(3)})`);
ok(directLow > 10, `direct bn at 15% DS diverges as documented (${directLow.toFixed(1)})`);

// H. Water-Tsat convention tied to IAPWS
const tSat20 = satTempCFromKPa(20);
ok(Number.isFinite(tSat20) && tSat20 > 50 && tSat20 < 70, `Tsat(20kPa)=${tSat20.toFixed(2)}C in range`);
ok(bpeEvaporator(65, 85, tSat20) > 0, 'BPE positive at water Tsat');

// I. Garbage in -> NaN out (no silent numbers)
ok(Number.isNaN(bpeEvaporator('', '', '')), 'blank inputs -> NaN');

console.log(fail === 0 ? 'ALL EVAP BPE TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
