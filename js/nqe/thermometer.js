// Ring-polymer "quantum thermometer": a bead cloud sampling the thermal
// density of a particle in a single well, via the path-integral classical
// isomorphism. Standalone: no dependency on the Schrödinger solver.
// Model units throughout: hbar = kB = 1.
//
// Unlike instanton.js (which extremizes the Euclidean action to find one
// dominant tunneling path), this samples the actual thermal distribution
// over ring-polymer configurations — the standard classical isomorphism at
// the heart of path-integral molecular dynamics. A single lowest-action path
// would just collapse to x=0 for any well and report zero size; only a
// genuine thermal ensemble has a nonzero, physically meaningful radius of
// gyration.
//
// The ring's nearest-neighbor spring coupling gets stiff at high T and mass
// (its natural frequencies scale as N*T), while the centroid mode has *no*
// spring restoring force at all and only equilibrates on the potential's own,
// far slower timescale. Those two facts together make naive explicit-Euler
// Langevin dynamics both unstable (small modes) and impractically slow to
// equilibrate (the centroid) at the same time — a genuinely stiff problem,
// not something a smaller fixed timestep fixes. The standard PIMD fix is
// used here instead: propagate the free ring polymer's normal modes with
// their exact (stability-unconditional) Ornstein-Uhlenbeck update, and apply
// the actual potential as an explicit real-space force in a Strang split
// around that exact step.

export function potential(x, { kind, k }) {
  return kind === 'quartic' ? k * x ** 4 : 0.5 * k * x * x;
}
export function force(x, { kind, k }) {
  return kind === 'quartic' ? -4 * k * x ** 3 : -k * x;
}

/**
 * Real, orthogonal ring normal-mode transform (Parseval: sum q_k^2 = sum x_i^2).
 * The transform matrix depends only on N, never on T/mass/potential, so it's
 * built once per N and reused — the original per-step Math.cos/sin calls
 * (4096 of them per step at N=32) were most of this module's cost.
 */
const modeCache = new Map();
function makeModes(N) {
  if (modeCache.has(N)) return modeCache.get(N);
  const half = N / 2;
  const s0 = Math.sqrt(1 / N), s2 = Math.sqrt(2 / N);
  // basis[k][i]: the k-th normal mode's real-space coefficient at bead i.
  const basis = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    basis[0][i] = s0;
    basis[half][i] = s0 * (i % 2 === 0 ? 1 : -1);
    for (let k = 1; k < half; k++) {
      const th = (2 * Math.PI * k * i) / N;
      basis[k][i] = s2 * Math.cos(th);
      basis[N - k][i] = s2 * Math.sin(th);
    }
  }
  const lambda = new Float64Array(N);
  for (let k = 0; k <= half; k++) lambda[k] = 2 * (1 - Math.cos((2 * Math.PI * k) / N));
  for (let k = 1; k < half; k++) lambda[N - k] = lambda[k];

  const modes = {
    lambda,
    toModes(x, q) {
      for (let k = 0; k < N; k++) {
        const bk = basis[k];
        let sum = 0;
        for (let i = 0; i < N; i++) sum += bk[i] * x[i];
        q[k] = sum;
      }
    },
    toReal(q, x) {
      x.fill(0);
      for (let k = 0; k < N; k++) {
        const bk = basis[k], qk = q[k];
        if (qk === 0) continue;
        for (let i = 0; i < N; i++) x[i] += bk[i] * qk;
      }
    },
  };
  modeCache.set(N, modes);
  return modes;
}

/**
 * Ring-polymer sampling at temperature T, mass `mass`, in a harmonic or
 * quartic well, accumulating <x^2> and the radius of gyration about the
 * centroid over `targetTime` of (imaginary-time-sampling) simulation.
 */
export function simulate({ kind, k, T, mass, N = 32, targetTime = 400, dt = 0.05, friction = 1, seed = 1 }) {
  const dtau = 1 / (N * T);
  const modes = makeModes(N);
  const springK = modes.lambda.map((l) => (mass * l) / dtau);   // per-mode spring stiffness; springK[0] = 0

  let s = seed >>> 0 || 1;
  function rand() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }
  function gauss() {
    const u1 = Math.max(rand(), 1e-12), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Exact half-step Ornstein–Uhlenbeck update for the free (spring-only)
  // ring, sampling a unit fictitious temperature — stable for any dt because
  // it is the closed-form solution, not a finite-difference approximation.
  function springHalfStep(q, halfdt) {
    for (let kk = 0; kk < N; kk++) {
      const kap = springK[kk];
      if (kap === 0) {
        q[kk] += Math.sqrt(2 * halfdt / friction) * gauss();          // free centroid: pure diffusion
      } else {
        const gamma = kap / friction;
        const decay = Math.exp(-gamma * halfdt);
        const varStat = 1 / kap;
        q[kk] = q[kk] * decay + Math.sqrt(varStat * (1 - decay * decay)) * gauss();
      }
    }
  }

  const x = new Float64Array(N), q = new Float64Array(N);
  const burnIn = Math.ceil((0.25 * targetTime) / dt);
  const steps = Math.ceil(targetTime / dt);
  let sumX2 = 0, sumRg2 = 0, nSamp = 0;

  for (let it = 0; it < steps + burnIn; it++) {
    modes.toModes(x, q);
    springHalfStep(q, dt / 2);
    modes.toReal(q, x);
    for (let i = 0; i < N; i++) x[i] += (dt / friction) * dtau * force(x[i], { kind, k });
    modes.toModes(x, q);
    springHalfStep(q, dt / 2);
    modes.toReal(q, x);

    if (it >= burnIn) {
      let mean = 0;
      for (let i = 0; i < N; i++) mean += x[i];
      mean /= N;
      let x2 = 0, rg2 = 0;
      for (let i = 0; i < N; i++) { x2 += x[i] * x[i]; rg2 += (x[i] - mean) ** 2; }
      sumX2 += x2 / N;
      sumRg2 += rg2 / N;
      nSamp++;
    }
  }
  return { meanX2: sumX2 / nSamp, Rg2: sumRg2 / nSamp, beads: Array.from(x) };
}

/** Exact quantum canonical <x^2> for a 1D harmonic oscillator (hbar=kB=1). */
export function exactHarmonicX2({ mass, omega, T }) {
  const beta = 1 / T;
  return (1 / (2 * mass * omega)) / Math.tanh((beta * omega) / 2);
}

/** Classical equipartition limit, for the high-T sanity check. */
export function classicalX2({ mass, omega, T }) {
  return T / (mass * omega * omega);
}
