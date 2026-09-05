import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, exactHarmonicX2, classicalX2 } from '../js/nqe/thermometer.js';

// Average a few seeds so the test is robust rather than dependent on one
// arbitrary seed's luck; simulate() is fully deterministic given a seed.
function avg(opts, seeds = [1, 2, 3]) {
  const vals = seeds.map((seed) => simulate({ ...opts, seed }).meanX2);
  return vals.reduce((a, b) => a + b) / vals.length;
}
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

test('harmonic well: sampled <x^2> matches the exact quantum formula, deep-quantum and classical regimes', () => {
  const mass = 1, k = 1, omega = 1;
  for (const T of [0.3, 3.0]) {
    const sim = avg({ kind: 'harmonic', k, T, mass, N: 32, targetTime: 3000 });
    const exact = exactHarmonicX2({ mass, omega, T });
    assert.ok(rel(sim, exact) < 0.15, `T=${T}: sim=${sim} exact=${exact}`);
  }
});

test('harmonic well: quantum correction shrinks toward the classical limit as T grows', () => {
  const mass = 1, k = 1, omega = 1, T = 3.0;
  const exact = exactHarmonicX2({ mass, omega, T });
  const cls = classicalX2({ mass, omega, T });
  assert.ok(rel(exact, cls) < 0.02, `exact/classical should nearly coincide at high T: ${exact} vs ${cls}`);
});

test('spread grows monotonically with T, quantum and classical alike', () => {
  // An unbounded harmonic well always spreads more at higher T; the quantum
  // effect is not a reversal of this trend.
  const mass = 1, k = 1;
  const lo = avg({ kind: 'harmonic', k, T: 0.3, mass, N: 32, targetTime: 3000 });
  const hi = avg({ kind: 'harmonic', k, T: 2.0, mass, N: 32, targetTime: 3000 });
  assert.ok(hi > lo, `T=2.0 spread (${hi}) should exceed T=0.3 spread (${lo})`);
});

test('as T -> 0, quantum <x^2> saturates at the zero-point floor while the classical prediction vanishes', () => {
  // This saturation — not a low-T increase — is the actual "quantum
  // thermometer" signature: classically the particle fully localizes as
  // T -> 0, quantum mechanically it never shrinks below 1/(2 m omega).
  const mass = 1, k = 1, omega = 1;
  const floor = 1 / (2 * mass * omega);
  const exactCold = exactHarmonicX2({ mass, omega, T: 0.02 });
  const clsCold = classicalX2({ mass, omega, T: 0.02 });
  assert.ok(rel(exactCold, floor) < 0.01, `should sit at the zero-point floor: ${exactCold} vs ${floor}`);
  assert.ok(clsCold < 0.1 * floor, `classical should have nearly vanished by comparison: ${clsCold}`);
});

test('spread shrinks as mass grows (heavier isotope, more classical) at fixed T', () => {
  const k = 1, T = 0.5;
  const light = avg({ kind: 'harmonic', k, T, mass: 1, N: 32, targetTime: 3000 });
  const heavy = avg({ kind: 'harmonic', k, T, mass: 3, N: 32, targetTime: 3000 });
  assert.ok(heavy < light, `heavier isotope (${heavy}) should be more localized than lighter (${light})`);
});

test('quartic well stays finite and shrinks with increasing stiffness', () => {
  const T = 1, mass = 1;
  const soft = avg({ kind: 'quartic', k: 0.5, T, mass, N: 32, targetTime: 3000 });
  const stiff = avg({ kind: 'quartic', k: 2.0, T, mass, N: 32, targetTime: 3000 });
  assert.ok(isFinite(soft) && isFinite(stiff) && soft > 0 && stiff > 0);
  assert.ok(stiff < soft, `stiffer quartic well (${stiff}) should be more localized than softer (${soft})`);
});

