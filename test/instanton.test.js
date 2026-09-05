import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potential, gradient, crossoverT, relaxInstanton } from '../js/nqe/instanton.js';

const a = 1, A = Math.PI * Math.PI;   // Tc = 1 exactly, by construction
const BASE = { A, a, ky: 20, w: 0.5, skew: 0.8 };

test('crossoverT matches the analytic barrier-top curvature, independent of skew', () => {
  for (const skew of [0, 0.8, 1.5]) {
    assert.ok(Math.abs(crossoverT({ ...BASE, skew }) - 1) < 1e-12);
  }
});

test('saddle and both minima sit exactly on y = g(x) for any skew (gradient vanishes)', () => {
  for (const skew of [0, 0.8, 1.5]) {
    const p = { ...BASE, skew };
    for (const x of [0, a, -a]) {
      const y = skew * Math.exp(-((x / p.w) ** 2));
      const [dVdx, dVdy] = gradient(x, y, p);
      assert.ok(Math.abs(dVdx) < 1e-10, `dV/dx at x=${x} = ${dVdx}`);
      assert.ok(Math.abs(dVdy) < 1e-10, `dV/dy at x=${x} = ${dVdy}`);
    }
  }
});

test('above T_c, the ring collapses to the saddle, and stays there under more iterations', () => {
  // 10000 steps (the app's default budget) is enough to fully converge at 2x T_c;
  // running far longer must not drift away, which is the actual regression to guard.
  const tol = { 10000: 1e-4, 40000: 1e-6 };
  for (const steps of [10000, 40000]) {
    const r = relaxInstanton(BASE, { T: 2.0, N: 32, steps, step: 0.004 });
    assert.ok(r.extent < tol[steps], `extent = ${r.extent} at steps=${steps}`);
    assert.ok(r.maxDeviation < tol[steps], `maxDeviation = ${r.maxDeviation} at steps=${steps}`);
  }
});

test('below T_c, a genuine extended path survives and shortens as T rises toward T_c', () => {
  const extents = [0.3, 0.6, 0.9].map(
    (T) => relaxInstanton(BASE, { T, N: 32, steps: 10000, step: 0.004 }).extent
  );
  assert.ok(extents[0] > 1, `extent at T=0.3 should be a large fraction of 2a: ${extents[0]}`);
  assert.ok(extents[0] > extents[1] && extents[1] > extents[2],
    `extent should shrink monotonically as T -> T_c: ${extents}`);
});

test('corner-cutting: zero deviation from the MEP when the valley is flat, nonzero when skewed', () => {
  const flat = relaxInstanton({ ...BASE, skew: 0 }, { T: 0.3, N: 32, steps: 10000, step: 0.004 });
  assert.equal(flat.maxDeviation, 0);

  const skewed = relaxInstanton({ ...BASE, skew: 0.8 }, { T: 0.3, N: 32, steps: 10000, step: 0.004 });
  assert.ok(skewed.maxDeviation > 0.1, `maxDeviation = ${skewed.maxDeviation}`);
});

test('the converged path stays exactly mirror-symmetric under the bounce topology', () => {
  const r = relaxInstanton(BASE, { T: 0.5, N: 32, steps: 10000, step: 0.004 });
  const N = r.path.length, half = N / 2;
  for (let i = 0; i < half; i++) {
    const p1 = r.path[i], p2 = r.path[i + half];
    assert.ok(Math.abs(p1.x + p2.x) < 1e-9, `x[${i}] + x[${i + half}] = ${p1.x + p2.x}`);
    assert.ok(Math.abs(p1.y - p2.y) < 1e-9, `y[${i}] - y[${i + half}] = ${p1.y - p2.y}`);
  }
});

test('relaxInstanton stays finite and bounded across the slider extremes', () => {
  for (const skew of [0, 1.5]) {
    for (const T of [0.1, 2.5]) {
      const r = relaxInstanton({ ...BASE, skew }, { T, N: 32, steps: 10000, step: 0.004 });
      assert.ok(isFinite(r.extent) && isFinite(r.action) && r.extent < 2 * a + 0.1,
        `skew=${skew} T=${T}: extent=${r.extent} action=${r.action}`);
    }
  }
});
