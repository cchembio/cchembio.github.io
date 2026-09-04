// Rate expressions. Atomic units (hbar = 1, so h = 2 pi).

import { KB_HARTREE, kT } from './units.js';

/** Gauss–Legendre nodes/weights on [-1,1] (gauleg, Newton on P_n). */
function gaussLegendre(n) {
  const x = new Float64Array(n), w = new Float64Array(n);
  const m = (n + 1) >> 1;
  for (let i = 0; i < m; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let pp = 0;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const z1 = z;
      z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-15) break;
    }
    x[i] = -z;
    x[n - 1 - i] = z;
    w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * pp * pp);
  }
  return { x, w };
}

/** k = (kB T / h) exp(-barrier / kB T) */
export function tstClassical({ barrier, T }) {
  const b = kT(T);
  return (b / (2 * Math.PI)) * Math.exp(-barrier / b);
}

/** Same, with the barrier shifted by the zero-point energy difference. */
export function tstZPE({ barrier, zpeReact, zpeTS, T }) {
  return tstClassical({ barrier: barrier + zpeTS - zpeReact, T });
}

/** kappa = 1 + (hbar |omega‡| / kB T)^2 / 24 */
export function wignerKappa({ omegaB, T }) {
  const u = omegaB / kT(T);
  return 1 + (u * u) / 24;
}

/**
 * Thermally averaged transmission coefficient
 *   kappa = exp(V1/kB T) / (kB T) * INT_0^inf P(E) exp(-E/kB T) dE
 * Classical P (step at the barrier) gives exactly 1.
 * Split at the barrier top: the integrand has a knee there.
 */
export function thermalTransmission({ transmission, barrier, T, nQuad = 64 }) {
  const b = kT(T);
  const eMax = barrier + 60 * b;
  const { x, w } = gaussLegendre(nQuad);
  let acc = 0;
  for (const [lo, hi] of [[0, barrier], [barrier, eMax]]) {
    if (hi <= lo) continue;
    const c = 0.5 * (hi + lo), h = 0.5 * (hi - lo);
    for (let i = 0; i < nQuad; i++) {
      const E = c + h * x[i];
      acc += h * w[i] * transmission(E) * Math.exp(-(E - barrier) / b);
    }
  }
  return acc / b;
}

export function kie(kH, kD) { return kH / kD; }

/** Crossover temperature T_c = hbar |omega‡| / (2 pi kB) */
export function crossoverT({ omegaB }) {
  return omegaB / (2 * Math.PI * KB_HARTREE);
}

/**
 * Gauss–Hermite nodes/weights for the weight exp(-t^2) (gauher).
 * Averaging f over a Gaussian of mean mu and width sigma:
 *   <f> = (1/sqrt(pi)) SUM w_i f(mu + sqrt(2) sigma t_i)
 */
export function gaussHermite(n) {
  const x = new Float64Array(n), w = new Float64Array(n);
  const m = (n + 1) >> 1;
  const PIM4 = Math.PI ** -0.25;
  let z = 0, pp = 0;
  for (let i = 0; i < m; i++) {
    if (i === 0) z = Math.sqrt(2 * n + 1) - 1.85575 * (2 * n + 1) ** -0.16667;
    else if (i === 1) z -= (1.14 * n ** 0.426) / z;
    else if (i === 2) z = 1.86 * z - 0.86 * x[0];
    else if (i === 3) z = 1.91 * z - 0.91 * x[1];
    else z = 2 * z - x[i - 2];
    for (let it = 0; it < 100; it++) {
      let p1 = PIM4, p2 = 0;
      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = z * Math.sqrt(2 / (j + 1)) * p2 - Math.sqrt(j / (j + 1)) * p3;
      }
      pp = Math.sqrt(2 * n) * p2;
      const z1 = z;
      z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-14) break;
    }
    x[i] = z;
    x[n - 1 - i] = -z;
    w[i] = w[n - 1 - i] = 2 / (pp * pp);
  }
  return { x, w };
}

/** Average f over a Gaussian distribution of mean mu and standard deviation sigma. */
export function gaussianAverage(f, mu, sigma, n = 9) {
  if (!(sigma > 0)) return f(mu);
  const { x, w } = gaussHermite(n);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += w[i] * f(mu + Math.SQRT2 * sigma * x[i]);
  return acc / Math.sqrt(Math.PI);
}
