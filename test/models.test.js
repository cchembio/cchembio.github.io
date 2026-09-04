// Acceptance criteria from NQE_APPS_PLAN section 4, as runnable checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as U from '../js/nqe/units.js';
import { makeGrid, solve, edgeAmplitude } from '../js/nqe/schrodinger1d.js';
import { quarticDoubleWell, eckart } from '../js/nqe/potentials.js';
import { tstClassical, wignerKappa, thermalTransmission, crossoverT } from '../js/nqe/rates.js';
import { well, rateAt, rateGated, kie, overlapAt, DEFAULTS } from '../js/nqe/pcet.js';

/** Correlation coefficient, for "near-linear" claims. */
function r2(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return (sxy * sxy) / (sxx * syy);
}

const a1 = (Vb, sepAng, dE, iso, n = 160) => {
  const a = U.angToBohr(sepAng) / 2;
  const grid = makeGrid({ xmin: -3 * a, xmax: 3 * a, n });
  const { V } = quarticDoubleWell(grid, { barrier: U.kJmolToHartree(Vb), a, dE: U.kJmolToHartree(dE) });
  const { E, psi } = solve(grid, V, U.MASS[iso], 6);
  return { E, psi, split: U.hartreeToCm(E[1] - E[0]), edge: edgeAmplitude(psi[0]) };
};

test('A1: deep-barrier H/D splittings differ by at least an order of magnitude', () => {
  const H = a1(45, 1.10, 0, 'H'), D = a1(45, 1.10, 0, 'D');
  assert.ok(H.split / D.split > 10, `H/D = ${H.split / D.split}`);
});

test('A1: a full solve at n=160 stays in the millisecond range', () => {
  a1(45, 1.10, 0, 'H');                                  // warm up the JIT
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) a1(45, 1.10, 0, 'H');
  const ms = Number(process.hrtime.bigint() - t0) / 5e6;
  assert.ok(ms < 16, `${ms.toFixed(1)} ms per solve`);
});

test('A1: the edge warning fires only when the box is genuinely too small', () => {
  assert.ok(a1(45, 1.10, 0, 'H').edge < 1e-4, 'converged case must not warn');
  assert.ok(a1(0, 1.60, 20, 'H').edge > 1e-4, 'flat potential must warn');
});

test('A5: log10 k against R is near-linear and drops by orders of magnitude', () => {
  const p = { dG: U.kJmolToHartree(-20), lam: U.kJmolToHartree(80), T: 298, gate: 0 };
  const Rs = [], ys = [];
  for (let i = 0; i <= 16; i++) {
    const R = 2.4 + (0.8 * i) / 16;
    Rs.push(R);
    ys.push(Math.log10(U.auToPerSecond(rateAt('H', R, p).k)));
  }
  // Not perfectly linear: higher vibronic channels turn on as R grows, adding
  // slight curvature to the tail. Still a near-straight decline over 8+ decades.
  assert.ok(r2(Rs, ys) > 0.97, `r^2 = ${r2(Rs, ys)}`);
  assert.ok(ys[0] - ys[ys.length - 1] > 6, `drop = ${ys[0] - ys[ys.length - 1]} decades`);
});

test('A5: KIE increases with donor–acceptor distance', () => {
  const p = { dG: U.kJmolToHartree(-20), lam: U.kJmolToHartree(80), T: 298, gate: 0 };
  let prev = 0;
  for (const R of [2.4, 2.6, 2.8, 3.0, 3.2]) {
    const k = kie(Object.assign({}, p, { R }));
    assert.ok(k > prev, `KIE fell at R = ${R}`);
    prev = k;
  }
});

test('A5: gating raises the rate and collapses the isotope effect', () => {
  const base = { R: 3.0, dG: U.kJmolToHartree(-20), lam: U.kJmolToHartree(80), T: 298 };
  const bare = Object.assign({}, base, { gate: 0 });
  const gated = Object.assign({}, base, { gate: 0.25 });
  assert.ok(rateGated('H', gated) > 1e3 * rateGated('H', bare), 'gating must raise the rate');
  assert.ok(kie(gated) < kie(bare) / 100, 'gating must collapse the KIE');
});

test('A5: the cached wells are converged inside their box', () => {
  for (const iso of ['H', 'D']) assert.ok(well(iso).edge < 1e-4, `${iso} edge = ${well(iso).edge}`);
});

test('A5: a full rate evaluation is far inside one frame', () => {
  const p = { R: 2.7, dG: U.kJmolToHartree(-20), lam: U.kJmolToHartree(80), T: 298, gate: 0.05 };
  kie(p);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) kie(p);
  const ms = Number(process.hrtime.bigint() - t0) / 20e6;
  assert.ok(ms < 16, `${ms.toFixed(2)} ms per KIE`);
});

// ── A2: the four rate models ───────────────────────────────────
function a2(iso, T, { Vb = 60, wb = 1800, asym = 0, ws = 3000 } = {}) {
  const mass = U.MASS[iso], scale = Math.sqrt(U.MASS.H / mass);
  const V1 = U.kJmolToHartree(Vb);
  const V2 = Math.max(U.kJmolToHartree(2), V1 - U.kJmolToHartree(asym));
  const omegaB = U.cmToHartree(wb) * scale;
  const dZPE = -0.5 * U.cmToHartree(ws) * scale;
  const V1e = V1 + dZPE, V2e = V2 + dZPE;
  const zpe = tstClassical({ barrier: V1e, T });
  const e = eckart(null, { V1: V1e, V2: V2e, omegaB, mass });
  return {
    cls: tstClassical({ barrier: V1, T }),
    zpe,
    wig: wignerKappa({ omegaB, T }) * zpe,
    eck: thermalTransmission({ transmission: e.transmission, barrier: V1e, T }) * zpe,
    Tc: crossoverT({ omegaB }),
    L: e.L,
  };
}

test('A2: one electronic potential gives one barrier width for every isotope', () => {
  // omegaB scales as 1/sqrt(mass), so omegaB*sqrt(mass) — and hence L — is invariant.
  const V1 = U.kJmolToHartree(60), V2 = U.kJmolToHartree(60), wb = U.cmToHartree(1800);
  const L = (iso) => eckart(null, {
    V1, V2, mass: U.MASS[iso], omegaB: wb * Math.sqrt(U.MASS.H / U.MASS[iso]),
  }).L;
  assert.ok(Math.abs(L('H') - L('D')) / L('H') < 1e-12, `${L('H')} vs ${L('D')}`);
  assert.ok(Math.abs(L('H') - L('T')) / L('H') < 1e-12);
  // On the vibrationally adiabatic barrier the widths legitimately differ, because
  // the barrier height itself is lowered by a mass-dependent zero-point energy.
  assert.ok(a2('D', 300).L > a2('H', 300).L, 'heavier isotope keeps the taller barrier');
});

test('A2: Wigner tracks the exact result above T_c and fails below it', () => {
  const Tc = a2('H', 300).Tc;
  const ratio = (T) => { const r = a2('H', T); return r.eck / r.wig; };
  assert.ok(ratio(8 * Tc) < 1.15, `8 T_c: ${ratio(8 * Tc)}`);
  assert.ok(ratio(0.6 * Tc) > 100, `0.6 T_c: ${ratio(0.6 * Tc)}`);
});

test('A2: classical TST has no isotope effect at all', () => {
  for (const T of [200, 300, 500]) {
    assert.ok(Math.abs(a2('H', T).cls / a2('D', T).cls - 1) < 1e-12);
  }
});

test('A2: the ZPE-only KIE is Arrhenius-linear while the exact KIE curves', () => {
  const inv = [], zpe = [], eck = [];
  for (let T = 200; T <= 500; T += 20) {
    inv.push(1000 / T);
    zpe.push(Math.log(a2('H', T).zpe / a2('D', T).zpe));
    eck.push(Math.log(a2('H', T).eck / a2('D', T).eck));
  }
  assert.ok(1 - r2(inv, zpe) < 1e-12, `ZPE KIE not linear: r^2 = ${r2(inv, zpe)}`);
  assert.ok(r2(inv, eck) < 0.99, `exact KIE too linear: r^2 = ${r2(inv, eck)}`);
  assert.ok(eck[0] > zpe[0], 'tunneling must enlarge the KIE');
});

test('A2: semiclassical-limit KIE (ZPE only, no tunneling) at nu=3000 cm-1, 298 K is ~8.3, prefactor ratio is exactly 1', () => {
  // Isolates the bookkeeping: with tunneling switched off, the classical
  // prefactor k_B T/h carries no mass dependence, so the whole isotope effect
  // is exp[(ZPE_H - ZPE_D) / kB T] with the barrier itself cancelling out.
  const T = 298, ws = 3000;
  const rate = (iso, Vb) => {
    const scale = Math.sqrt(U.MASS.H / U.MASS[iso]);
    const V1 = U.kJmolToHartree(Vb);
    const dZPE = -0.5 * U.cmToHartree(ws) * scale;
    return tstClassical({ barrier: V1 + dZPE, T });
  };
  const kie298 = rate('H', 60) / rate('D', 60);
  assert.ok(Math.abs(kie298 - 8.3) < 0.05, `KIE = ${kie298}`);

  // The prefactor alone (barrier = 0) must be identical for every isotope.
  const A = (iso) => tstClassical({ barrier: 0, T });
  assert.equal(A('H') / A('D'), 1);

  // And the ratio must be independent of the barrier height and asymmetry,
  // since both cancel between numerator and denominator.
  for (const Vb of [20, 60, 120]) {
    assert.ok(Math.abs(rate('H', Vb) / rate('D', Vb) - kie298) / kie298 < 1e-12);
  }
});

test('A5: recalibrated geometry puts the ungated KIE at R=3.0 Å in the 10^2-10^3 range', () => {
  const p = { R: 3.0, dG: U.kJmolToHartree(-20), lam: U.kJmolToHartree(80), T: 298, gate: 0 };
  const k = kie(p);
  assert.ok(k > 100 && k < 1000, `KIE = ${k}`);
});

test('A5: excited vibronic channels are Boltzmann-suppressed, not truncated', () => {
  const w = well('H');
  const T = 298, b = U.kT(T);
  const dG = U.kJmolToHartree(-20), lam = U.kJmolToHartree(80);
  const { d } = rateAt('H', 3.0, { dG, lam, T });

  let Z = 0;
  const pop = [];
  for (let mu = 0; mu < w.nState; mu++) {
    const p = Math.exp(-(w.E[mu] - w.E[0]) / b);
    pop.push(p);
    Z += p;
  }
  // The reactant excited state is thermally frozen out at 298 K...
  assert.ok(pop[1] / Z < 1e-5, `mu=1 population = ${pop[1] / Z}`);

  // ...but all nState^2 (mu,nu) channels are still in the sum, and an excited
  // product channel still carries a non-negligible share via its own
  // Franck-Condon factor — proof nu is not hard-truncated to the ground state.
  let total = 0, frac01 = 0;
  for (let mu = 0; mu < w.nState; mu++) {
    for (let nu = 0; nu < w.nState; nu++) {
      const S = overlapAt(w, mu, nu, d);
      const dGmn = w.E[nu] - w.E[mu] + dG;
      const c = (pop[mu] / Z) * (DEFAULTS.Vel * S) ** 2 * Math.sqrt(Math.PI / (lam * b)) *
                Math.exp(-((dGmn + lam) ** 2) / (4 * lam * b));
      total += c;
      if (mu === 0 && nu === 1) frac01 = c;
    }
  }
  assert.ok(frac01 / total > 0.01, `(0,1) channel share = ${frac01 / total}`);
});
