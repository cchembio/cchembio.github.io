// Nonadiabatic vibronic (PCET) rate model, shared by nqe_pcet_overlap and
// nqe_predict_compare. Atomic units throughout.
//
// The two diabatic proton wells are rigid Morse functions of fixed shape: the
// donor–acceptor distance only translates them, and the driving force only
// shifts the product energies. Nothing here depends on R, so the eigenvalue
// problem is solved once per isotope and every slider drag is arithmetic.

import * as U from './units.js';
import { makeGrid, solve, edgeAmplitude } from './schrodinger1d.js';
import { morse } from './potentials.js';
import { gaussianAverage } from './rates.js';

// The proton-well separation d does not track the heavy-atom distance R 1:1.
// Part of any change in R is absorbed by the donor/acceptor covalent bonds
// themselves relaxing (the well known correlation whereby a shorter, stronger
// hydrogen bond comes with a longer, more delocalized X–H bond) rather than by
// moving the proton. geomSlope is the fraction of R that reaches the proton
// coordinate; d0 is the well separation at the reference distance R0. With a
// ~0.1 Å ground-state width at 3000 cm⁻¹, this keeps the ungated KIE in the
// 10²–10³ range at R = 3.0 Å, where measured PCET kinetic isotope effects sit,
// rather than in the 10⁵–10⁷ range a rigid 1:1 geometric mapping produces.
const R0 = U.angToBohr(2.8);

export const DEFAULTS = {
  De: U.kJmolToHartree(440),     // proton well depth, O–H like
  omegaH: U.cmToHartree(3000),   // O–H stretch for the H isotope
  d0: U.angToBohr(0.50),         // proton-well separation at R = R0
  geomSlope: 0.75,               // fraction of dR reaching the proton coordinate
  Vel: U.cmToHartree(20),        // electronic coupling
  nState: 4,
};

const cache = new Map();

/** Solve the reactant Morse well once per (isotope, well shape). */
export function well(iso, opt = {}) {
  const { De, omegaH, nState } = Object.assign({}, DEFAULTS, opt);
  const key = `${iso}|${De}|${omegaH}|${nState}`;
  if (cache.has(key)) return cache.get(key);
  const alpha = omegaH * Math.sqrt(U.MASS.H / (2 * De));   // one potential for all isotopes
  const grid = makeGrid({ xmin: -1.6, xmax: 6.4, n: 240 });
  const { V } = morse(grid, { De, alpha, x0: 0 });
  const { E, psi } = solve(grid, V, U.MASS[iso], nState);
  const edge = Math.max(...psi.map((p) => edgeAmplitude(p)));
  const w = { grid, V, E, psi, alpha, De, nState, edge };
  if (cache.size > 40) cache.clear();   // sweeping a well-shape slider must not leak
  cache.set(key, w);
  return w;
}

/** psi_n sampled at arbitrary x by Catmull–Rom interpolation; 0 off the grid. */
export function psiAt(w, n, x) {
  const { grid } = w;
  const t = (x - grid.x[0]) / grid.dx;
  const i = Math.floor(t);
  if (i < 1 || i > grid.n - 3) return 0;
  const f = t - i, p = w.psi[n];
  const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
  return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
}

/** S_mu_nu at well separation d (bohr): INT psi_mu(u) psi_nu(d - u) du */
export function overlapAt(w, mu, nu, d) {
  const { grid } = w;
  let s = 0;
  for (let i = 0; i < grid.n; i++) s += w.psi[mu][i] * psiAt(w, nu, d - grid.x[i]);
  return s * grid.dx;
}

/**
 * k = SUM_mu P_mu SUM_nu |V_el S_mu_nu|^2 sqrt(pi/(lambda kB T)) exp(-(dG_mu_nu + lambda)^2 / (4 lambda kB T))
 * R in Å; dG and lam in hartree. Returns the rate in atomic units.
 */
export function rateAt(iso, R, { dG, lam, T }, opt = {}) {
  const { d0, geomSlope, Vel, nState } = Object.assign({}, DEFAULTS, opt);
  const w = well(iso, opt);
  const d = Math.max(0, d0 + geomSlope * (U.angToBohr(R) - R0));
  const b = U.kT(T);
  const pre = Math.sqrt(Math.PI / (lam * b));            // hbar = 1

  let Z = 0;
  const pop = [];
  for (let mu = 0; mu < nState; mu++) {
    const p = Math.exp(-(w.E[mu] - w.E[0]) / b);
    pop.push(p);
    Z += p;
  }

  let k = 0, s00 = 0;
  for (let mu = 0; mu < nState; mu++) {
    for (let nu = 0; nu < nState; nu++) {
      const S = overlapAt(w, mu, nu, d);
      if (mu === 0 && nu === 0) s00 = S;
      const dGmn = w.E[nu] - w.E[mu] + dG;
      k += (pop[mu] / Z) * (Vel * S) ** 2 * pre *
           Math.exp(-((dGmn + lam) ** 2) / (4 * lam * b));
    }
  }
  return { k, s00, d };
}

/** Rate averaged over a harmonic gating distribution in R (Gauss–Hermite). */
export function rateGated(iso, p, opt = {}) {
  return gaussianAverage((R) => rateAt(iso, R, p, opt).k, p.R, p.gate || 0, 9);
}

export const kie = (p, opt = {}) => rateGated('H', p, opt) / rateGated('D', p, opt);
