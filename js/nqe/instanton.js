// Ring-polymer instanton search on a 2D model surface with a curved valley.
// Standalone: no dependency on the Schrödinger solver used by the other apps.
// Model units throughout: mass = hbar = kB = 1.
//
// Surface: a symmetric double well along x, coupled to a transverse harmonic
// mode y whose equilibrium position follows a bump g(x) centred on the
// barrier. The bump makes the minimum-energy path (MEP) curve away from
// y = 0 near the saddle without moving the saddle or the minima (both always
// sit exactly on y = g(x), independent of the bump height): substituting
// y = g(x) into V collapses it to the bare double well Vx(x), so x = 0, ±a
// stay critical points of the full surface for any skew.

function g(x, { w, skew }) {
  return skew * Math.exp(-((x / w) ** 2));
}
function gPrime(x, { w, skew }) {
  return skew * (-2 * x / (w * w)) * Math.exp(-((x / w) ** 2));
}

export function potential(x, y, p) {
  const { A, a, ky } = p;
  const dy = y - g(x, p);
  return A * (x * x - a * a) ** 2 + 0.5 * ky * dy * dy;
}

/** [dV/dx, dV/dy] */
export function gradient(x, y, p) {
  const { A, a, ky } = p;
  const dy = y - g(x, p);
  const dVdx = 4 * A * x * (x * x - a * a) + ky * dy * (-gPrime(x, p));
  const dVdy = ky * dy;
  return [dVdx, dVdy];
}

/**
 * Crossover temperature T_c = |omega_double-dagger| / (2 pi), from the
 * curvature at the saddle (x=0, y=g(0)). The cross term dV/dxdy vanishes
 * there because g'(0) = 0 (g is even), so the Hessian is diagonal and the
 * unstable eigenvalue is exactly the bare double well's: V''_xx(0) = -4Aa^2.
 * T_c is therefore independent of skew and the transverse stiffness ky.
 */
export function crossoverT({ A, a }) {
  const omegaDagger = 2 * a * Math.sqrt(A);
  return omegaDagger / (2 * Math.PI);
}

/**
 * Minimize the discretized Euclidean action of an N-bead ring polymer at
 * temperature T by steepest descent with a fixed step and iteration cap.
 *
 * The ring is initialized as x_i = a*cos(2 pi i/N), y_i = g(x_i): a closed
 * loop that visits both wells once per period (a "bounce"), symmetric under
 * the combined parity + half-period shift that the double well and an even
 * g(x) share. Gradient descent from an exactly symmetric configuration on an
 * exactly symmetric surface cannot break that symmetry, so it can only
 * converge to a symmetric stationary point — the genuine instanton below
 * T_c, or the fully collapsed point at the saddle above T_c — without any
 * dedicated saddle-search machinery.
 */
export function relaxInstanton(p, { T, N = 32, steps = 2000, step = 0.01 }) {
  const dtau = 1 / (N * T);
  const x = new Float64Array(N), y = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = p.a * Math.cos((2 * Math.PI * i) / N);
    y[i] = g(x[i], p);
  }
  const gx = new Float64Array(N), gy = new Float64Array(N);
  const half = N / 2;
  for (let it = 0; it < steps; it++) {
    for (let i = 0; i < N; i++) {
      const ip = (i + 1) % N, im = (i - 1 + N) % N;
      const [dVdx, dVdy] = gradient(x[i], y[i], p);
      gx[i] = (2 * x[i] - x[ip] - x[im]) / dtau + dtau * dVdx;
      gy[i] = (2 * y[i] - y[ip] - y[im]) / dtau + dtau * dVdy;
    }
    for (let i = 0; i < N; i++) {
      x[i] -= step * gx[i];
      y[i] -= step * gy[i];
    }
    // The bounce topology is mirror-symmetric (x -> -x paired with a
    // half-period shift); re-impose that symmetry every step so floating-
    // point noise can't grow into the runaway collapse-to-one-well mode a
    // plain steepest descent eventually finds given enough iterations. The
    // genuine instanton already satisfies this up to numerical noise, so
    // this only removes noise, never distorts a real solution.
    for (let i = 0; i < half; i++) {
      const j = i + half;
      const mx = (x[i] - x[j]) / 2, my = (y[i] + y[j]) / 2;
      x[i] = mx; x[j] = -mx;
      y[i] = my; y[j] = my;
    }
  }

  let action = 0, maxDev = 0, xMin = Infinity, xMax = -Infinity;
  for (let i = 0; i < N; i++) {
    const ip = (i + 1) % N;
    const dx = x[ip] - x[i], dy2 = y[ip] - y[i];
    action += (dx * dx + dy2 * dy2) / (2 * dtau) + dtau * potential(x[i], y[i], p);
    maxDev = Math.max(maxDev, Math.abs(y[i] - g(x[i], p)));
    xMin = Math.min(xMin, x[i]);
    xMax = Math.max(xMax, x[i]);
  }
  const extent = xMax - xMin;
  const path = Array.from({ length: N }, (_, i) => ({ x: x[i], y: y[i] }));
  return { path, action, extent, maxDeviation: maxDev };
}
