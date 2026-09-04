// Model potentials. All arguments in atomic units; x on the grid is in bohr.
// Each returns { V } plus the analytic extras the apps and tests need.

/** V(x) = 0.5 m omega^2 (x - x0)^2, V(x0) = 0 */
export function harmonic(grid, { omega, mass, x0 = 0 }) {
  const V = new Float64Array(grid.n);
  const k = 0.5 * mass * omega * omega;
  for (let i = 0; i < grid.n; i++) {
    const dxx = grid.x[i] - x0;
    V[i] = k * dxx * dxx;
  }
  return {
    V,
    levels: (nMax) =>
      Float64Array.from({ length: nMax + 1 }, (_, n) => omega * (n + 0.5)),
  };
}

/** V(x) = De (1 - exp(-alpha (x - x0)))^2, V(x0) = 0, asymptote De */
export function morse(grid, { De, alpha, x0 = 0 }) {
  const V = new Float64Array(grid.n);
  for (let i = 0; i < grid.n; i++) {
    const t = 1 - Math.exp(-alpha * (grid.x[i] - x0));
    V[i] = De * t * t;
  }
  return {
    V,
    omega: (mass) => alpha * Math.sqrt(2 * De / mass),
    nMaxBound: (mass) => Math.floor(Math.sqrt(2 * De * mass) / alpha - 0.5),
    levels: (mass, nMax) => {
      const w = alpha * Math.sqrt(2 * De / mass);
      return Float64Array.from({ length: nMax + 1 }, (_, n) => {
        const v = n + 0.5;
        return w * v - (w * w * v * v) / (4 * De);
      });
    },
  };
}

/**
 * V(x) = A (x^2 - a^2)^2 + B x,  A = barrier / a^4,  B = dE / (2 a)
 *   a       — half the well separation
 *   barrier — central maximum above the minima (at dE = 0)
 *   dE      — V(+a) - V(-a); positive means the right well is higher
 * For dE != 0 the minima shift off ±a, so report them numerically.
 */
export function quarticDoubleWell(grid, { barrier, a, dE = 0 }) {
  const A = barrier / (a * a * a * a);
  const B = dE / (2 * a);
  const f = (x) => A * (x * x - a * a) ** 2 + B * x;
  const V = new Float64Array(grid.n);
  for (let i = 0; i < grid.n; i++) V[i] = f(grid.x[i]);

  // Stationary points of 4A x^3 - 4A a^2 x + B by fine scan + parabolic refine.
  // ponytail: 4000-point scan beats a cubic solver nobody will reread at 3am.
  const stat = () => {
    const lo = -2 * a, hi = 2 * a, m = 4000, h = (hi - lo) / m;
    const pts = [];
    let prev = f(lo), prevPrev = null;
    for (let i = 1; i <= m; i++) {
      const x = lo + i * h, cur = f(x);
      if (prevPrev !== null) {
        const xm = x - h;
        const isMin = prev < prevPrev && prev < cur;
        const isMax = prev > prevPrev && prev > cur;
        if (isMin || isMax) {
          const den = prevPrev - 2 * prev + cur;
          const xr = den === 0 ? xm : xm + (h * (prevPrev - cur)) / (2 * den);
          pts.push({ x: xr, V: f(xr), kind: isMin ? 'min' : 'max' });
        }
      }
      prevPrev = prev;
      prev = cur;
    }
    return pts;
  };

  // At barrier = 0 the polynomial is linear and has no stationary point at all,
  // so every caller needs a fallback; give them one here rather than five times.
  const minima = () => {
    const mins = stat().filter((s) => s.kind === 'min').sort((u, v) => u.V - v.V);
    if (mins.length) return mins;
    let xb = grid.x[0], vb = V[0];
    for (let i = 1; i < grid.n; i++) if (V[i] < vb) { vb = V[i]; xb = grid.x[i]; }
    return [{ x: xb, V: vb, kind: 'min' }];
  };
  const barrierTop = () => stat().find((s) => s.kind === 'max') || null;

  return { V, f, A, B, potentialAt: f, stationary: stat, minima, barrierTop };
}

/**
 * Eckart barrier.  y = exp(2 pi x / L),  V = A y/(1+y) + B y/(1+y)^2
 * V(-inf) = 0 (reactant side, zero of energy), V(+inf) = A.
 *   V1     — forward barrier height (reactant asymptote -> maximum), > 0
 *   V2     — reverse barrier height (product asymptote -> maximum), > 0
 *   omegaB — magnitude of the imaginary barrier frequency, positive
 *   mass   — reduced mass along the reaction coordinate
 * Energies passed to transmission(E) are measured from the reactant asymptote.
 */
export function eckart(grid, { V1, V2, omegaB, mass }) {
  const A = V1 - V2;
  const B = (Math.sqrt(V1) + Math.sqrt(V2)) ** 2;
  if (!(B > Math.abs(A))) throw new Error('eckart: need B > |A|');

  const L = (2 * Math.PI * (B * B - A * A)) / (omegaB * Math.sqrt(8 * mass * B * B * B));
  const xMax = (L / (2 * Math.PI)) * Math.log((A + B) / (B - A));
  const f = (x) => {
    const y = Math.exp((2 * Math.PI * x) / L);
    if (!isFinite(y)) return A;                 // y -> inf
    return (A * y) / (1 + y) + (B * y) / (1 + y) ** 2;
  };

  const V = grid ? new Float64Array(grid.n) : null;
  if (grid) for (let i = 0; i < grid.n; i++) V[i] = f(grid.x[i]);

  const C = (2 * Math.PI * Math.PI) / (mass * L * L);

  function transmission(E) {
    if (E <= Math.max(0, A)) return 0;          // a or b imaginary
    const a2 = 0.5 * Math.sqrt(E / C);
    const b2 = 0.5 * Math.sqrt((E - A) / C);
    const sum = 2 * Math.PI * (a2 + b2);
    const dif = 2 * Math.PI * (a2 - b2);
    // d imaginary when C > B: cosh(2 pi d) -> cos(2 pi |d|)
    const dTerm = C > B
      ? Math.cos(2 * Math.PI * 0.5 * Math.sqrt((C - B) / C))
      : Math.cosh(2 * Math.PI * 0.5 * Math.sqrt((B - C) / C));
    if (sum > 300) {
      // cosh(sum) dominates everything; ratio -> 1 to within double precision
      return 1;
    }
    const num = Math.cosh(sum) - Math.cosh(dif);
    const den = Math.cosh(sum) + dTerm;
    return Math.min(1, Math.max(0, num / den));
  }

  return { V, f, A, B, C, L, xMax, vMax: ((A + B) ** 2) / (4 * B), transmission };
}
