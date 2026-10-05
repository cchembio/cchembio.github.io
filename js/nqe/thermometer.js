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
 * A ring-polymer Langevin sampler that can be advanced a few steps at a time,
 * so the app can animate it. `x` is the live bead array (read, don't write).
 */
export function createSampler({ kind, k, T, mass, N = 32, dt = 0.05, friction = 1, seed = 1, centroidMobility = 1 }) {
  const dtau = 1 / (N * T);
  // The centroid only feels the potential, scaled by dtau, so at high T it
  // relaxes on a ~N*T/k timescale. A larger centroid mobility (applied to both
  // its drift and its noise) speeds that up without changing the distribution.
  const M0 = centroidMobility;
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
        q[kk] += Math.sqrt(2 * M0 * halfdt / friction) * gauss();     // free centroid: pure diffusion
      } else {
        const gamma = kap / friction;
        const decay = Math.exp(-gamma * halfdt);
        const varStat = 1 / kap;
        q[kk] = q[kk] * decay + Math.sqrt(varStat * (1 - decay * decay)) * gauss();
      }
    }
  }

  const x = new Float64Array(N), q = new Float64Array(N);
  const f = new Float64Array(N), fq = new Float64Array(N);
  function step() {
    modes.toModes(x, q);
    springHalfStep(q, dt / 2);
    modes.toReal(q, x);
    for (let i = 0; i < N; i++) f[i] = dtau * force(x[i], { kind, k });
    if (M0 !== 1) {                       // scale only the centroid's share of the force
      modes.toModes(f, fq);
      fq[0] *= M0;
      modes.toReal(fq, f);
    }
    for (let i = 0; i < N; i++) x[i] += (dt / friction) * f[i];
    modes.toModes(x, q);
    springHalfStep(q, dt / 2);
    modes.toReal(q, x);
  }
  return { x, step, dt };
}

/**
 * A single classical particle at temperature T in the same well: underdamped
 * Langevin dynamics (BAOAB splitting), so it visibly oscillates in the well
 * while the random kicks and friction keep it at temperature T. Its position
 * distribution is the Boltzmann one, exp(-V/T), whatever the mass; the mass
 * only sets how fast it moves. `x` is a length-1 array (read, don't write).
 */
export function createClassicalSampler({ kind, k, T, mass, dt = 0.05, friction = 1, seed = 1 }) {
  let s = seed >>> 0 || 1;
  function rand() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }
  function gauss() {
    const u1 = Math.max(rand(), 1e-12), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  const c = Math.exp(-friction * dt), noise = Math.sqrt((1 - c * c) * T / mass);
  const x = new Float64Array(1);
  let v = Math.sqrt(T / mass) * gauss();
  function step() {
    v += (0.5 * dt * force(x[0], { kind, k })) / mass;
    x[0] += 0.5 * dt * v;
    v = c * v + noise * gauss();
    x[0] += 0.5 * dt * v;
    v += (0.5 * dt * force(x[0], { kind, k })) / mass;
  }
  return { x, step, dt };
}

/** Instantaneous <x^2> and squared radius of gyration (about the centroid) of a ring. */
export function ringStats(x) {
  const N = x.length;
  let mean = 0;
  for (let i = 0; i < N; i++) mean += x[i];
  mean /= N;
  let x2 = 0, rg2 = 0;
  for (let i = 0; i < N; i++) { x2 += x[i] * x[i]; rg2 += (x[i] - mean) ** 2; }
  return { centroid: mean, x2: x2 / N, rg2: rg2 / N };
}

/**
 * Ring-polymer sampling at temperature T, mass `mass`, in a harmonic or
 * quartic well, accumulating <x^2> and the radius of gyration about the
 * centroid over `targetTime` of simulation (after a 25% burn-in).
 *
 * Incremental form: advance(maxSteps) runs at most that many steps and returns
 * true once finished, so a caller can spread the work over several tasks.
 */
export function startSimulation({ kind, k, T, mass, N = 32, targetTime = 400, dt = 0.05, friction = 1, seed = 1 }) {
  const sampler = createSampler({ kind, k, T, mass, N, dt, friction, seed });
  const burnIn = Math.ceil((0.25 * targetTime) / dt);
  const total = Math.ceil(targetTime / dt) + burnIn;
  let it = 0, sumX2 = 0, sumRg2 = 0, nSamp = 0;
  return {
    advance(maxSteps = Infinity) {
      const end = Math.min(total, it + maxSteps);
      for (; it < end; it++) {
        sampler.step();
        if (it >= burnIn) {
          const st = ringStats(sampler.x);
          sumX2 += st.x2;
          sumRg2 += st.rg2;
          nSamp++;
        }
      }
      return it >= total;
    },
    result: () => ({ meanX2: sumX2 / nSamp, Rg2: sumRg2 / nSamp, beads: Array.from(sampler.x) }),
  };
}

/** One-shot form of startSimulation. */
export function simulate(opts) {
  const run = startSimulation(opts);
  run.advance();
  return run.result();
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
