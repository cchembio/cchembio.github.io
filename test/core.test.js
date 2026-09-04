import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as U from '../js/nqe/units.js';
import { symmetricEigen } from '../js/nqe/eigen.js';
import { makeGrid, solve, overlap, edgeAmplitude } from '../js/nqe/schrodinger1d.js';
import { harmonic, morse, quarticDoubleWell, eckart } from '../js/nqe/potentials.js';
import { thermalTransmission, wignerKappa, crossoverT, tstClassical } from '../js/nqe/rates.js';

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

test('unit conversions round-trip', () => {
  for (const v of [0.1, 1, 137.0]) {
    assert.ok(rel(U.bohrToAng(U.angToBohr(v)), v) < 1e-14);
    assert.ok(rel(U.hartreeToCm(U.cmToHartree(v)), v) < 1e-14);
    assert.ok(rel(U.hartreeToKJmol(U.kJmolToHartree(v)), v) < 1e-14);
  }
  assert.equal(U.kT(300), U.KB_HARTREE * 300);
});

test('symmetricEigen reproduces a known 3x3 spectrum', () => {
  // diag(1,2,3) rotated: eigenvalues must come back as 1,2,3
  const A = Float64Array.from([2, 1, 0, 1, 2, 1, 0, 1, 2]);
  const { values, vectors } = symmetricEigen(A.slice(), 3);
  const exact = [2 - Math.SQRT2, 2, 2 + Math.SQRT2];
  values.forEach((v, i) => assert.ok(Math.abs(v - exact[i]) < 1e-12));
  // columns orthonormal
  for (let j = 0; j < 3; j++) {
    let nn = 0;
    for (let k = 0; k < 3; k++) nn += vectors[k * 3 + j] ** 2;
    assert.ok(Math.abs(nn - 1) < 1e-12);
  }
});

test('harmonic oscillator: E_n = (n + 1/2) hbar omega', () => {
  const mass = U.MASS.H, omega = 0.01;
  const w = Math.sqrt(1 / (mass * omega));           // length scale
  const grid = makeGrid({ xmin: -9 * w, xmax: 9 * w, n: 160 });
  const { V, levels } = harmonic(grid, { omega, mass, x0: 0 });
  const { E, psi } = solve(grid, V, mass, 6);
  const exact = levels(5);
  for (let n = 0; n <= 5; n++) assert.ok(rel(E[n], exact[n]) < 1e-8, `n=${n} rel=${rel(E[n], exact[n])}`);
  assert.ok(edgeAmplitude(psi[0]) < 1e-8);
});

test('particle in a box: n^2 spectrum and the wall-corrected ground state', () => {
  const mass = 1, Lbox = 10, Vwall = 50;
  const grid = makeGrid({ xmin: -2, xmax: 12, n: 600 });
  const V = new Float64Array(grid.n);
  for (let i = 0; i < grid.n; i++) if (grid.x[i] < 0 || grid.x[i] > Lbox) V[i] = Vwall;
  const { E } = solve(grid, V, mass, 4);

  // The E_n proportional to n^2 law is the analytic content; it must be exact.
  for (let n = 2; n <= 4; n++) {
    assert.ok(rel(E[n - 1] / E[0], n * n) < 1e-4, `E${n}/E1 = ${E[n - 1] / E[0]}`);
  }
  // A finite wall of height Vwall leaks by 1/kappa on each side; correct for it.
  const kappa = Math.sqrt(2 * mass * (Vwall - E[0]));
  const Leff = Lbox + 2 / kappa;
  const exact = (Math.PI * Math.PI) / (2 * mass * Leff * Leff);
  assert.ok(rel(E[0], exact) < 5e-3, `E1 = ${E[0]} vs wall-corrected ${exact}`);
});

test('Morse against its closed-form spectrum', () => {
  const mass = U.MASS.H, De = 0.15, alpha = 1.1;
  const grid = makeGrid({ xmin: -1.6, xmax: 9, n: 300 });
  const m = morse(grid, { De, alpha, x0: 0 });
  const { E } = solve(grid, m.V, mass, 5);
  const exact = m.levels(mass, 4);
  for (let n = 0; n <= 4; n++) assert.ok(rel(E[n], exact[n]) < 1e-5, `n=${n} rel=${rel(E[n], exact[n])}`);
});

test('overlap of a normalized state with itself is 1', () => {
  const mass = U.MASS.H, omega = 0.01;
  const grid = makeGrid({ xmin: -3, xmax: 3, n: 160 });
  const { V } = harmonic(grid, { omega, mass, x0: 0 });
  const { psi } = solve(grid, V, mass, 3);
  assert.ok(Math.abs(overlap(psi[0], psi[0], grid.dx) - 1) < 1e-10);
  assert.ok(Math.abs(overlap(psi[0], psi[1], grid.dx)) < 1e-10);
});

test('symmetric double well: splitting is small and beats WKB by no more than an order', () => {
  const mass = U.MASS.H;
  const a = U.angToBohr(0.4), barrier = U.kJmolToHartree(40);
  const grid = makeGrid({ xmin: -3 * a, xmax: 3 * a, n: 200 });
  const { V } = quarticDoubleWell(grid, { barrier, a, dE: 0 });
  const { E } = solve(grid, V, mass, 4);
  const split = E[1] - E[0];
  assert.ok(split > 0);
  assert.ok(split < 0.2 * (E[2] - E[0]), 'tunneling doublet well below the next pair');

  // WKB estimate: hbar omega/pi * exp(-theta), theta = INT |p| dx across the barrier
  const A = barrier / a ** 4;
  const omega0 = Math.sqrt(8 * A * a * a / mass);
  const nQ = 4001;
  let theta = 0;
  for (let i = 0; i < nQ; i++) {
    const x = -a + (2 * a * i) / (nQ - 1);
    const Vx = A * (x * x - a * a) ** 2;
    const diff = Vx - E[0];
    if (diff > 0) theta += Math.sqrt(2 * mass * diff) * ((2 * a) / (nQ - 1));
  }
  const wkb = (omega0 / Math.PI) * Math.exp(-theta);
  const ratio = split / wkb;
  assert.ok(ratio > 0.1 && ratio < 10, `splitting/WKB = ${ratio}`);
});

test('deuterium splitting is far below hydrogen in the deep-barrier limit', () => {
  const a = U.angToBohr(0.45), barrier = U.kJmolToHartree(50);
  const grid = makeGrid({ xmin: -3 * a, xmax: 3 * a, n: 220 });
  const { V } = quarticDoubleWell(grid, { barrier, a, dE: 0 });
  const sH = (() => { const { E } = solve(grid, V, U.MASS.H, 2); return E[1] - E[0]; })();
  const sD = (() => { const { E } = solve(grid, V, U.MASS.D, 2); return E[1] - E[0]; })();
  assert.ok(sH / sD > 10, `H/D splitting ratio ${sH / sD}`);
});

test('eckart: geometry, curvature and V(x_max)', () => {
  const mass = U.MASS.H;
  const V1 = U.kJmolToHartree(60), V2 = U.kJmolToHartree(40);
  const omegaB = U.cmToHartree(1000);
  const e = eckart(null, { V1, V2, omegaB, mass });

  assert.ok(rel(e.f(e.xMax), V1) < 1e-10, 'V(x_max) == V1');
  assert.ok(rel(e.vMax, V1) < 1e-12);

  const h = e.L * 1e-4;
  const d2 = (e.f(e.xMax + h) - 2 * e.f(e.xMax) + e.f(e.xMax - h)) / (h * h);
  const omegaBack = Math.sqrt(Math.abs(d2) / mass);
  assert.ok(rel(omegaBack, omegaB) < 1e-6, `omegaB round-trip rel=${rel(omegaBack, omegaB)}`);

  assert.ok(Math.abs(e.f(-40 * e.L)) < 1e-12, 'reactant asymptote is 0');
  assert.ok(rel(e.f(40 * e.L), e.A) < 1e-9, 'product asymptote is A');
});

test('eckart transmission: limits, half-height and isotope symmetry', () => {
  const mass = U.MASS.H, omegaB = U.cmToHartree(1000);
  const Vb = U.kJmolToHartree(50);
  const sym = eckart(null, { V1: Vb, V2: Vb, omegaB, mass });

  assert.equal(sym.transmission(0), 0);
  assert.equal(sym.transmission(-1e-4), 0);
  assert.ok(sym.transmission(10 * Vb) > 0.999, 'P -> 1 at high E');
  // P(V1) -> 1/2 only as the barrier deepens; check the value and the trend.
  const pAt = (kj) => {
    const v = U.kJmolToHartree(kj);
    return eckart(null, { V1: v, V2: v, omegaB, mass }).transmission(v);
  };
  assert.ok(Math.abs(pAt(100) - 0.5) < 0.03, `P(V1) deep = ${pAt(100)}`);
  assert.ok(pAt(30) > pAt(50) && pAt(50) > pAt(100), 'P(V1) approaches 1/2 from above');

  // asymmetric: P is unchanged under V1<->V2 when E is re-referenced
  const V1 = U.kJmolToHartree(60), V2 = U.kJmolToHartree(35);
  const fwd = eckart(null, { V1, V2, omegaB, mass });
  const rev = eckart(null, { V1: V2, V2: V1, omegaB, mass });
  for (const frac of [0.8, 1.0, 1.3]) {
    const E = frac * V1;                       // from the reactant asymptote
    const Erev = E - fwd.A;                    // same total energy, product side
    assert.ok(Math.abs(fwd.transmission(E) - rev.transmission(Erev)) < 1e-9);
  }
});

test('thermal transmission: classical step gives exactly 1, eckart exceeds Wigner below T_c', () => {
  const barrier = U.kJmolToHartree(50);
  const step = (E) => (E >= barrier ? 1 : 0);
  for (const T of [200, 300, 500]) {
    const k = thermalTransmission({ transmission: step, barrier, T, nQuad: 64 });
    assert.ok(rel(k, 1) < 1e-6, `classical kappa at ${T} K = ${k}`);
  }

  const mass = U.MASS.H, omegaB = U.cmToHartree(1200);
  const e = eckart(null, { V1: barrier, V2: barrier, omegaB, mass });
  const Tc = crossoverT({ omegaB });
  assert.ok(Tc > 100 && Tc < 400, `T_c = ${Tc} K`);

  const hot = 2 * Tc, cold = 0.5 * Tc;
  const kHot = thermalTransmission({ transmission: e.transmission, barrier, T: hot });
  const kCold = thermalTransmission({ transmission: e.transmission, barrier, T: cold });
  assert.ok(kCold > kHot, 'tunneling grows as T falls');
  // Well above T_c both tend to 1 and agree; below T_c the exact result runs away.
  const kappaAt = (T) => thermalTransmission({ transmission: e.transmission, barrier, T });
  const ratio = (T) => kappaAt(T) / wignerKappa({ omegaB, T });
  assert.ok(ratio(10 * Tc) < 1.1, `10 T_c ratio = ${ratio(10 * Tc)}`);
  assert.ok(ratio(6 * Tc) < 1.25, `6 T_c ratio = ${ratio(6 * Tc)}`);
  assert.ok(ratio(cold) > 1e3, `below T_c ratio = ${ratio(cold)}`);
  assert.ok(kappaAt(10 * Tc) < 1.15, 'kappa -> 1 at high T');
});

test('tstClassical is Arrhenius in the barrier', () => {
  const b = U.kJmolToHartree(50);
  assert.ok(tstClassical({ barrier: b, T: 301 }) > tstClassical({ barrier: b, T: 300 }), 'rate rises with T');
  // slope of ln k vs 1/T recovers the barrier (plus the kB T prefactor)
  const T1 = 300, T2 = 320;
  const slope = (Math.log(tstClassical({ barrier: b, T: T2 })) - Math.log(tstClassical({ barrier: b, T: T1 })))
              / (1 / T2 - 1 / T1);
  // The kB T/h prefactor adds one kB T: Ea = barrier + kB T, not the barrier itself.
  const Ea = -slope * U.KB_HARTREE;
  const expected = b + U.kT(0.5 * (T1 + T2));
  assert.ok(rel(Ea, expected) < 2e-3, `apparent Ea = ${U.hartreeToKJmol(Ea)} kJ/mol`);
});

test('Gauss–Hermite average reproduces Gaussian moments', async () => {
  const { gaussianAverage } = await import('../js/nqe/rates.js');
  const mu = 2.5, sigma = 0.4;
  assert.ok(rel(gaussianAverage((x) => x, mu, sigma), mu) < 1e-12);
  assert.ok(rel(gaussianAverage((x) => x * x, mu, sigma), mu * mu + sigma * sigma) < 1e-12);
  // <exp(a x)> = exp(a mu + a^2 sigma^2 / 2): the exponential R-dependence gating averages
  const a = 3;
  assert.ok(rel(gaussianAverage((x) => Math.exp(a * x), mu, sigma),
    Math.exp(a * mu + (a * a * sigma * sigma) / 2)) < 1e-6);
  assert.equal(gaussianAverage((x) => x * x, mu, 0), mu * mu);
});
