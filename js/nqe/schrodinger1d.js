// 1D Schrödinger solver on a uniform grid, sinc-DVR (Colbert–Miller) kinetic
// energy. Atomic units throughout (hbar = 1).

import { symmetricEigen } from './eigen.js';

export function makeGrid({ xmin, xmax, n = 160 }) {
  const x = new Float64Array(n);
  const dx = (xmax - xmin) / (n - 1);
  for (let i = 0; i < n; i++) x[i] = xmin + i * dx;
  return { x, dx, n };
}

/**
 * H = T + diag(V), row-major Float64Array(n*n).
 * T_ij = hbar^2/(2 m dx^2) * (-1)^(i-j) * { pi^2/3 (i==j), 2/(i-j)^2 (i!=j) }
 */
export function buildHamiltonian(grid, V, mass) {
  const { n, dx } = grid;
  const pre = 1 / (2 * mass * dx * dx);
  const H = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    H[i * n + i] = pre * (Math.PI * Math.PI / 3) + V[i];
    for (let j = i + 1; j < n; j++) {
      const d = i - j;
      const t = pre * ((d % 2 === 0) ? 1 : -1) * (2 / (d * d));
      H[i * n + j] = t;
      H[j * n + i] = t;
    }
  }
  return H;
}

/** Lowest nStates eigenpairs. psi normalized so sum(psi^2)*dx == 1. */
export function solve(grid, V, mass, nStates = 6) {
  const { n, dx } = grid;
  const { values, vectors } = symmetricEigen(buildHamiltonian(grid, V, mass), n);
  const k = Math.min(nStates, n);
  const E = values.slice(0, k);
  const psi = [];
  const norm = 1 / Math.sqrt(dx);
  for (let j = 0; j < k; j++) {
    const v = new Float64Array(n);
    let peak = 0, peakVal = 0;
    for (let i = 0; i < n; i++) {
      v[i] = vectors[i * n + j] * norm;
      if (Math.abs(v[i]) > peakVal) { peakVal = Math.abs(v[i]); peak = i; }
    }
    if (v[peak] < 0) for (let i = 0; i < n; i++) v[i] = -v[i]; // fixed sign
    psi.push(v);
  }
  return { E, psi };
}

export function overlap(psiA, psiB, dx) {
  let s = 0;
  for (let i = 0; i < psiA.length; i++) s += psiA[i] * psiB[i];
  return s * dx;
}

/** Largest |psi| within k points of either edge — the box-too-small canary. */
export function edgeAmplitude(psi, k = 3) {
  const n = psi.length;
  let m = 0;
  for (let i = 0; i < k; i++) {
    m = Math.max(m, Math.abs(psi[i]), Math.abs(psi[n - 1 - i]));
  }
  return m;
}

/** <x> and <x^2> for a normalized state; width = sqrt(<x^2> - <x>^2). */
export function moments(psi, grid) {
  const { x, dx } = grid;
  let m1 = 0, m2 = 0;
  for (let i = 0; i < psi.length; i++) {
    const p = psi[i] * psi[i] * dx;
    m1 += x[i] * p;
    m2 += x[i] * x[i] * p;
  }
  return { mean: m1, width: Math.sqrt(Math.max(0, m2 - m1 * m1)) };
}
