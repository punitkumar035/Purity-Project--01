// Test runner: node tests/run.js (repo root contract for ALL verification).
// Runs syntax check + every harness sequentially; non-zero exit on any failure.
const { execFileSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SUITES = [
  ['syntax', process.execPath, ['--check', path.join(ROOT, 'js', 'main.js')], true],
  ['phase1-units-ports-validation', process.execPath, [path.join(__dirname, 'evap_phase1_smoke.js')]],
  ['phase2-bpe', process.execPath, [path.join(__dirname, 'evap_phase2_smoke.js')]],
  ['phase3-solver-core', process.execPath, [path.join(__dirname, 'evap_phase3_smoke.js')]],
  ['phase4-cascade-regression', process.execPath, [path.join(__dirname, 'evap_phase4_smoke.js')]],
  ['phase5-live-station-loop', process.execPath, [path.join(__dirname, 'evap_phase5_live.js')]],
  ['phase6-property-window', process.execPath, [path.join(__dirname, 'evap_phase6_props.js')]],
  ['phase7-modeb-solve', process.execPath, [path.join(__dirname, 'evap_phase7_modeb.js')]],
  ['phase8-plumbing-hardening', process.execPath, [path.join(__dirname, 'evap_phase8_plumbing.js')]],
  ['ui9-netstatus-box', process.execPath, [path.join(__dirname, 'ui_phase9_netstatus.js')]],
];
let failed = 0;
for (const [name, cmd, args, quiet] of SUITES) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: quiet ? 'ignore' : 'pipe' });
    if (!quiet) {
      const tail = String(out).trim().split('\n').slice(-1)[0];
      console.log('PASS ' + name + ' :: ' + tail);
    } else console.log('PASS ' + name);
  } catch (e) {
    failed++;
    const tail = String((e.stdout || '') + (e.stderr || '')).trim().split('\n').filter(l => /FAIL|Error/i.test(l)).slice(0, 6).join('\n');
    console.log('FAIL ' + name + '\n' + tail);
  }
}
console.log(failed === 0 ? 'ALL SUITES PASS' : failed + ' SUITE(S) FAILED');
process.exit(failed ? 1 : 0);
