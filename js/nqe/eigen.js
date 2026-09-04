// Symmetric eigensolver: Householder reduction (tred2) + implicit QL with
// shifts (tqli). Numerical Recipes algorithms, 0-indexed, row-major.
// ponytail: one routine covers every solve in these apps; no LA dependency.

function pythag(a, b) {
  const aa = Math.abs(a), ab = Math.abs(b);
  if (aa > ab) return aa * Math.sqrt(1 + (ab / aa) ** 2);
  return ab === 0 ? 0 : ab * Math.sqrt(1 + (aa / ab) ** 2);
}

const sign = (a, b) => (b >= 0 ? Math.abs(a) : -Math.abs(a));

/**
 * A: Float64Array of length n*n, row-major, symmetric. Destroyed in place.
 * Returns eigenvalues ascending and matching eigenvectors as columns:
 * component k of eigenvector j is vectors[k*n + j].
 */
export function symmetricEigen(A, n) {
  const d = new Float64Array(n);
  const e = new Float64Array(n);
  let i, j, k, l, f, g, h, hh, scale;

  // --- tred2: reduce to tridiagonal, accumulating the transformation ---
  for (i = n - 1; i >= 1; i--) {
    l = i - 1;
    h = scale = 0;
    if (l > 0) {
      for (k = 0; k <= l; k++) scale += Math.abs(A[i * n + k]);
      if (scale === 0) {
        e[i] = A[i * n + l];
      } else {
        for (k = 0; k <= l; k++) {
          A[i * n + k] /= scale;
          h += A[i * n + k] * A[i * n + k];
        }
        f = A[i * n + l];
        g = f >= 0 ? -Math.sqrt(h) : Math.sqrt(h);
        e[i] = scale * g;
        h -= f * g;
        A[i * n + l] = f - g;
        f = 0;
        for (j = 0; j <= l; j++) {
          A[j * n + i] = A[i * n + j] / h;
          g = 0;
          for (k = 0; k <= j; k++) g += A[j * n + k] * A[i * n + k];
          for (k = j + 1; k <= l; k++) g += A[k * n + j] * A[i * n + k];
          e[j] = g / h;
          f += e[j] * A[i * n + j];
        }
        hh = f / (h + h);
        for (j = 0; j <= l; j++) {
          f = A[i * n + j];
          e[j] = g = e[j] - hh * f;
          for (k = 0; k <= j; k++) A[j * n + k] -= f * e[k] + g * A[i * n + k];
        }
      }
    } else {
      e[i] = A[i * n + l];
    }
    d[i] = h;
  }
  d[0] = 0;
  e[0] = 0;
  for (i = 0; i < n; i++) {
    l = i - 1;
    if (d[i]) {
      for (j = 0; j <= l; j++) {
        g = 0;
        for (k = 0; k <= l; k++) g += A[i * n + k] * A[k * n + j];
        for (k = 0; k <= l; k++) A[k * n + j] -= g * A[k * n + i];
      }
    }
    d[i] = A[i * n + i];
    A[i * n + i] = 1;
    for (j = 0; j <= l; j++) A[j * n + i] = A[i * n + j] = 0;
  }

  // --- tqli: QL with implicit shifts on the tridiagonal form ---
  let m, iter, s, c, p, r, b;
  for (i = 1; i < n; i++) e[i - 1] = e[i];
  e[n - 1] = 0;
  for (l = 0; l < n; l++) {
    iter = 0;
    do {
      for (m = l; m < n - 1; m++) {
        const dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
        if (Math.abs(e[m]) <= Number.EPSILON * dd) break;
      }
      if (m !== l) {
        if (iter++ === 50) throw new Error('symmetricEigen: no convergence');
        g = (d[l + 1] - d[l]) / (2 * e[l]);
        r = pythag(g, 1);
        g = d[m] - d[l] + e[l] / (g + sign(r, g));
        s = c = 1;
        p = 0;
        for (i = m - 1; i >= l; i--) {
          f = s * e[i];
          b = c * e[i];
          e[i + 1] = r = pythag(f, g);
          if (r === 0) {
            d[i + 1] -= p;
            e[m] = 0;
            break;
          }
          s = f / r;
          c = g / r;
          g = d[i + 1] - p;
          r = (d[i] - g) * s + 2 * c * b;
          d[i + 1] = g + (p = s * r);
          g = c * r - b;
          for (k = 0; k < n; k++) {
            f = A[k * n + i + 1];
            A[k * n + i + 1] = s * A[k * n + i] + c * f;
            A[k * n + i] = c * A[k * n + i] - s * f;
          }
        }
        if (r === 0 && i >= l) continue;
        d[l] -= p;
        e[l] = g;
        e[m] = 0;
      }
    } while (m !== l);
  }

  // --- sort ascending, carrying the columns along ---
  const order = Array.from({ length: n }, (_, q) => q).sort((p1, p2) => d[p1] - d[p2]);
  const values = new Float64Array(n);
  const vectors = new Float64Array(n * n);
  for (j = 0; j < n; j++) {
    const src = order[j];
    values[j] = d[src];
    for (k = 0; k < n; k++) vectors[k * n + j] = A[k * n + src];
  }
  return { values, vectors };
}
