# NQE apps — implementation spec

Seven browser apps for `cchembio.github.io`, sharing one 1D Schrödinger solver.
Target: `apps/nqe_*.html` plus shared modules under `assets/js/nqe/`.

Status: M0–M9 implemented (A1, A5, A2, A4, A6). A3 and A7 not built.

Decisions from section 9, as settled:
1. **Language** — English throughout, apps and `teaching.html` cards alike.
2. **Shared modules** — `js/nqe/` (the repo's existing `js/`, not a new `assets/`
   tree), loaded as ES modules. No bundler. Apps need to be served over http;
   they do not run from `file://`.
3. **A3** — not built. A7 likewise.

Departures from this spec, and why:
- Shared CSS lives in `css/nqe.css` rather than being repeated in five files.
- `js/nqe/pcet.js` holds the vibronic rate model shared by A5 and A6.
- A2's zero-point-energy bookkeeping: the X–H stretch carries ½ħω in the
  reactant and becomes the reaction coordinate at the barrier top, so it
  contributes none there; a spectator present on both sides cancels exactly.
  The slider is labelled "X–H stretch ν" rather than "spectator frequency"
  because that is the mode it actually controls.
- A4 gained a well-asymmetry slider: in a symmetric double well ⟨x⟩ = 0 for
  every isotope by symmetry, so there is no geometric isotope effect to show.

---

## 1. Deliverables

| # | File | Depends on |
|---|---|---|
| A1 | `apps/nqe_proton_well.html` | core |
| A5 | `apps/nqe_pcet_overlap.html` | core |
| A2 | `apps/nqe_rate_models.html` | core + rates |
| A4 | `apps/nqe_density.html` | core |
| A6 | `apps/nqe_predict_compare.html` | rates, A5 model |
| A3 | `apps/nqe_instanton.html` | standalone, optional |
| A7 | `apps/nqe_thermometer.html` | standalone, optional |

Plus: `assets/js/nqe/*.js`, `images/apps/nqe_*.png`, `test/*.test.js`, and a new
section appended to `teaching.html` (§6).

---

## 2. Repo conventions

Existing site conventions, follow them:

- App files: `apps/`, snake_case, `.html`, no framework, no bundler.
- Previews: `images/apps/<appname>.png`, same aspect ratio as existing previews.
- Palette, type scale and control layout: read `apps/euler_demo.html` and
  `apps/kinetics_demo.html` and reuse. Do not introduce a new visual language.

Departure from convention: existing apps are self-contained single files. These
seven share a non-trivial solver, so shared ES modules go in `assets/js/nqe/`,
loaded as `<script type="module" src="../assets/js/nqe/…">`. Consequence: apps
will not run from `file://`. See §8 decision 2.

Global UI requirements for every app:

- Legible when projected at 1024×768: body text ≥ 16 px, no hairline strokes.
- H / D / T distinguished by line style as well as colour.
- Visible keyboard focus; `prefers-reduced-motion` respected.
- No `localStorage`. State lives in the URL hash.
- Every app has a preset dropdown (§5).

---

## 3. Core modules

### `units.js`

Atomic units internally; convert only at the display boundary. No constant is
inlined anywhere else in the codebase.

```js
export const MASS = { H: 1836.152673, D: 3670.482967, T: 5496.921535 }; // m_e
export const BOHR_ANG      = 0.529177210903;
export const HARTREE_KJMOL = 2625.4996;
export const HARTREE_CM    = 219474.6314;
export const HARTREE_EV    = 27.211386;
export const KB_HARTREE    = 3.166811563e-6;   // hartree / K
export const HBAR = 1;

export function angToBohr(x) {}
export function bohrToAng(x) {}
export function hartreeToCm(e) {}
export function hartreeToKJmol(e) {}
export function kT(T) {}            // returns KB_HARTREE * T
```

### `eigen.js`

```js
// A: Float64Array of length n*n, row-major, symmetric. Destroyed in place.
// Returns eigenvalues ascending and matching eigenvectors as columns.
export function symmetricEigen(A, n) // -> { values: Float64Array, vectors: Float64Array }
```

Householder reduction (`tred2`) plus implicit QL with shifts (`tqli`). ~150
lines. No external linear algebra dependency; one routine is all that is needed.

### `schrodinger1d.js`

```js
export function makeGrid({ xmin, xmax, n })     // -> { x: Float64Array, dx, n }
export function buildHamiltonian(grid, V, mass) // -> Float64Array(n*n)
export function solve(grid, V, mass, nStates)   // -> { E: Float64Array, psi: Float64Array[] }
export function overlap(psiA, psiB, dx)         // -> number
export function edgeAmplitude(psi, k = 3)       // -> max |psi| within k points of either edge
```

Sinc-DVR (Colbert–Miller) kinetic energy on a uniform grid:

```
T_ij = (hbar^2 / (2 m dx^2)) * (-1)^(i-j) * { pi^2/3      if i == j
                                            { 2/(i-j)^2   otherwise
```

Potential is diagonal. `psi` normalized so `sum(psi^2) * dx == 1`.

Default `n = 160`. Keep `n` in 128–192; a full solve must stay in the
millisecond range.

### `potentials.js`

All arguments in atomic units. `x` on the grid is in bohr; sliders convert at the
UI boundary. Each function returns `{ V: Float64Array }` plus the analytic extras
listed below.

```js
export function harmonic(grid, { omega, mass, x0 })
export function morse(grid, { De, alpha, x0 })
export function quarticDoubleWell(grid, { barrier, a, dE })
export function eckart(grid, { V1, V2, omegaB, mass })
```

#### `harmonic`

```
V(x) = 0.5 * mass * omega^2 * (x - x0)^2
```

Reference: `V(x0) = 0`. Analytic levels `E_n = omega * (n + 1/2)` exposed as
`levels(nMax)` for the test suite.

#### `morse`

```
V(x) = De * (1 - exp(-alpha * (x - x0)))^2
```

Reference: `V(x0) = 0`, dissociation asymptote at `De`. Harmonic frequency
`omega = alpha * sqrt(2 * De / mass)`. Analytic levels

```
E_n = omega * (n + 1/2) - omega^2 * (n + 1/2)^2 / (4 * De)
```

exposed as `levels(mass, nMax)`, valid up to `n_max = floor(sqrt(2*De*mass)/alpha - 1/2)`.

#### `quarticDoubleWell`

Parameterized by observables, not by the raw polynomial coefficients:

```
V(x) = A * (x^2 - a^2)^2 + B * x      with  A = barrier / a^4,  B = dE / (2*a)
```

- `a` — half the well separation; minima sit at `x = ±a` for `dE = 0`
- `barrier` — height of the central maximum above the minima at `dE = 0`
- `dE` — energy difference between the wells, `V(+a) - V(-a) = dE`; positive
  means the right-hand well is higher

Reference: `V(±a) = 0` at `dE = 0`. For `dE != 0` the minima shift slightly off
`±a`; report the true minima numerically rather than assuming `±a`.

#### `eckart`

This is the one with real convention ambiguity. Fix it as follows.

```
y(x) = exp(2*pi*x / L)
V(x) = A*y/(1 + y) + B*y/(1 + y)^2
```

Asymptotes: `V(-inf) = 0` (reactant side, the zero of energy) and `V(+inf) = A`.
Energies `E` passed to `transmission(E)` are measured from the reactant
asymptote.

Inputs and their meaning:

- `V1` — forward barrier height, from the reactant asymptote to the maximum. Always positive.
- `V2` — reverse barrier height, from the product asymptote to the maximum. Always positive.
- `omegaB` — **magnitude** of the imaginary barrier frequency, stored as a positive number. Never pass a negative or imaginary value; the UI slider is labelled `|omega‡|`.
- `mass` — reduced mass along the reaction coordinate.

Derived coefficients:

```
A = V1 - V2                    // reaction energy, products minus reactants
B = (sqrt(V1) + sqrt(V2))^2
```

Check `B > |A|`, which holds for any positive `V1`, `V2`. The maximum sits at

```
x_max = (L / (2*pi)) * ln((A + B) / (B - A))     with  V(x_max) = (A + B)^2 / (4*B) = V1
```

The width `L` follows from the curvature at the maximum. With
`F = |d^2V/dx^2|` at the maximum and `omegaB = sqrt(F / mass)`:

```
F = (2*pi/L)^2 * (B^2 - A^2)^2 / (8 * B^3)

L = 2*pi * (B^2 - A^2) / (omegaB * sqrt(8 * mass * B^3))
```

Verify this numerically in the test suite: rebuild `V` on a fine grid, take the
second derivative at `x_max`, and confirm it reproduces `omegaB` to 1e-6
relative. A silent error in `L` shifts every rate in A2 without changing the
shape of any curve.

Analytic transmission, with `hbar = 1`:

```
C = 2 * pi^2 / (mass * L^2)

a = 0.5 * sqrt(E / C)
b = 0.5 * sqrt((E - A) / C)
d = 0.5 * sqrt((B - C) / C)

P(E) = [cosh(2*pi*(a + b)) - cosh(2*pi*(a - b))]
     / [cosh(2*pi*(a + b)) + cosh(2*pi*d)]
```

Edge cases to handle explicitly:

- `E <= max(0, A)`: one of `a`, `b` is imaginary. Return `P = 0`.
- `C > B`: `d` is imaginary. Substitute `cosh(2*pi*d) -> cos(2*pi*|d|)`, using
  `|d| = 0.5 * sqrt((C - B) / C)`.
- Large arguments overflow `cosh`. Above roughly `2*pi*(a+b) > 300`, evaluate the
  ratio in log form or clamp to `P = 1`.

Sanity checks for the test suite: `P -> 1` as `E` grows large; `P(V1) ≈ 0.5` for
a symmetric barrier; `P` is unchanged under swapping `V1` and `V2` when `E` is
re-referenced to the product asymptote.

### `rates.js`

```js
export function tstClassical({ barrier, T })
export function tstZPE({ barrier, zpeReact, zpeTS, T })
export function wignerKappa({ omegaB, T })              // 1 + (hbar*omegaB/(kB*T))^2 / 24
export function thermalTransmission({ transmission, barrier, T, nQuad = 64 })
export function kie(kH, kD)
export function crossoverT({ omegaB })                  // hbar*omegaB / (2*pi*kB)
```

`thermalTransmission` uses Gauss–Legendre quadrature over E.

### `plot.js`

Minimal canvas plotting. No charting library.

```js
export function createPlot(canvas, { xlabel, ylabel, xlim, ylim })
plot.line(xs, ys, { color, dash, width })
plot.fillBetween(xs, y1, y2, { color, alpha })
plot.levels(energies, { xrange })       // horizontal lines inside a potential
plot.marker(x, y, opts)
plot.clear(); plot.draw();
```

### `ui.js`

```js
export function slider({ label, min, max, step, value, unit, onInput })
export function presetSelect(presets, onSelect)
export const hashState = { read(), write(obj) }
export function scheduleRecompute(fn)   // requestAnimationFrame throttle + param-hash cache
```

---

## 4. App specs

### A1 `nqe_proton_well.html`

Potential: `quarticDoubleWell`.

| Control | Range |
|---|---|
| Barrier height | 0 – 60 kJ/mol |
| Well separation `2a` | 0.4 – 1.6 Å |
| Asymmetry `B` | −20 – +20 kJ/mol |
| Mass | H / D / T |
| Classical ↔ quantum | toggle |

Compute: lowest 6 states. Display levels drawn inside the potential, |ψ|² for the
selected states, zero-point energy, tunneling splitting E₁−E₀ in cm⁻¹.

Classical mode draws a point particle at the potential minimum instead of the
density. This toggle is the app's primary control — give it visual weight above
the sliders.

Acceptance: full recompute under 16 ms at n=160; splitting for H vs D differs by
at least an order of magnitude in the deep-barrier preset; edge-amplitude warning
fires when the box is narrowed below the density width.

### A5 `nqe_pcet_overlap.html`

Two diabatic proton potentials on a **shared grid**. Wells are `morse` or
`harmonic`; their separation is driven by the donor–acceptor distance R.

| Control | Range |
|---|---|
| Donor–acceptor distance R | 2.4 – 3.2 Å |
| ΔG | −100 – +50 kJ/mol |
| λ | 20 – 200 kJ/mol |
| Gating amplitude | 0 – 0.3 Å |
| Temperature | 200 – 400 K |
| Mass | H / D |

Compute lowest ~4 states per well, overlaps `S_mu_nu` via `overlap()`, couplings
`V_mu_nu = V_el * S_mu_nu`, then

```
k = SUM_mu P_mu SUM_nu |V_mu_nu|^2 * sqrt(pi/(lambda*kB*T*hbar^2))
                                   * exp( -(dG_mu_nu + lambda)^2 / (4*lambda*kB*T) )
```

Gating: average `k(R)` over a harmonic distribution in R (Gauss–Hermite, 9
points is enough).

**Layout requirement.** The shaded overlap region between the two wavefunctions
is the primary visual and occupies the largest panel. Rate, KIE and coupling are
secondary numeric readouts. Dragging R must visibly thin the overlap while the
rate readout drops by orders of magnitude, in the same frame.

Potentials are analytic and parameterized, not fitted. Render a persistent note
in the app: illustrative parameters, not fitted to a specific system.

Acceptance: `log10(k)` vs R is near-linear over the slider range; KIE increases
with R; recompute under 16 ms.

### A2 `nqe_rate_models.html`

Potential: `eckart`, not the quartic well — its transmission is analytic, so the
"exact" curve is exact for that potential. State this in the app.

Curves on an Arrhenius plot (`ln k` vs `1000/T`), plus a second panel for KIE(T):

1. classical TST
2. ZPE-corrected TST
3. Wigner
4. Eckart (thermally averaged analytic transmission) — labelled exact

Add a **spectator harmonic mode** with a mass-dependent frequency, present in the
reactant and at the barrier top. Without it the ZPE correction in a 1D model is
circular, since the mode carrying the reactant zero-point energy is the reaction
coordinate itself. Expose its frequency as a slider (500 – 3500 cm⁻¹).

| Control | Range |
|---|---|
| Barrier height | 20 – 120 kJ/mol |
| Barrier frequency \|ω‡\| | 200 – 2000 cm⁻¹ (magnitude; see `eckart` conventions) |
| Reaction asymmetry | −40 – +40 kJ/mol |
| Spectator frequency | 500 – 3500 cm⁻¹ |
| T range | 200 – 500 K |

Display crossover temperature as a marked vertical line on the Arrhenius plot.

Acceptance: Wigner and exact coincide above T_c and diverge below; KIE from
ZPE-corrected TST is temperature-independent in the Arrhenius sense while the
exact KIE curves.

### A4 `nqe_density.html`

Reuses A1's solver. Double well whose barrier height and separation are both
parameterized by a single donor–acceptor distance slider.

Display |ψ₀|² for H and D simultaneously, the density width (⟨x²⟩−⟨x⟩²)^½ for
each, and ⟨x⟩ against the classical minimum position. The H/D difference in ⟨x⟩
is the readout that matters; label it as the geometric isotope effect.

### A6 `nqe_predict_compare.html`

Forward model only: model parameters in, predicted observables out. Reuses
`rates.js` and A5's rate model.

Inputs: barrier, frequencies, R, ΔG, λ. Outputs: predicted KIE, KIE(T), KIE(R),
with a user-entered measured value overlaid as a marker for comparison.

Do not build the inverse direction (measured value → mechanistic conclusion).

### A3 `nqe_instanton.html` (optional)

Standalone, no shared core. 2D model surface, ring polymer of 32 beads, action
minimized by gradient descent with a fixed step and an iteration cap. Show bead
collapse to the saddle above T_c, path shortening with T, and the path deviating
from the minimum energy path (corner cutting). Temperature and surface skew as
the only controls.

### A7 `nqe_thermometer.html` (optional)

Standalone. Bead cloud in a harmonic or quartic well; radius of gyration plotted
against temperature and mass.

---

## 5. Presets and state

Every app: a named preset dropdown, and full parameter state encoded in the URL
hash so a preset can be linked directly from slides.

Minimum preset sets:

- A1: symmetric deep barrier / symmetric shallow / strongly asymmetric
- A2: above crossover / below crossover / large tunneling KIE
- A5: short distance / long distance / strongly gated
- A4: short hydrogen bond / long hydrogen bond

`hashState.write()` on every committed change; `hashState.read()` on load, with
preset defaults as fallback.

Boundary check in every app using the solver: if `edgeAmplitude(psi) > 1e-4`,
show a visible warning that the box is too small and the levels are unconverged.
This is the failure mode most likely to produce a plausible-looking wrong result
during a live demonstration.

---

## 6. `teaching.html`

Append one new section **after** the Quantenchemie (QC) section, at the bottom of
the page, with the header:

```
Nuclear quantum effects
```

Mirror the existing section markup exactly: the badge element (QC → NQE), the
section heading, the subtitle line, and the per-app card structure — preview
image linking to the app, `h3` title, category line, description paragraph,
"App starten ↗" link. Reuse the existing classes; do not invent new ones. The
section must be structurally indistinguishable from those above it.

Card titles and category lines:

| App | Title | Category line |
|---|---|---|
| A1 | Proton in a potential | Zero-point energy, delocalization, tunneling |
| A5 | PCET as an overlap problem | Vibronic coupling & nonadiabatic rates |
| A2 | Rate models compared | Transition state theory & tunneling corrections |
| A4 | Quantum vs point-particle proton | Nuclear wavefunctions & geometric isotope effects |
| A6 | Model prediction vs measurement | Kinetic isotope effects from a model |
| A3 | Instanton paths | Deep tunneling & the crossover temperature |

---

## 7. Tests

`node --test`, no framework. Run M1's tests before building anything visual: a
wrong solver still renders convincingly.

- Harmonic oscillator: `E_n = (n + 1/2) * hbar * omega`, relative error < 1e-8, n ≤ 5
- Particle in a box against analytic levels
- Morse against its closed-form spectrum
- Symmetric double well: splitting vs WKB in the deep-barrier limit, order of magnitude
- Eckart: numerical second derivative at `x_max` reproduces the input `omegaB` to 1e-6 relative
- Eckart: `V(x_max) == V1` to 1e-10; `P(E)` limits and symmetry as listed in §3
- Eckart: thermal transmission coefficient at several T against tabulated values
- Every unit conversion round-trips
- `overlap()` of a normalized state with itself equals 1 to 1e-10

---

## 8. Build order

| | Task | Estimate | Risk |
|---|---|---|---|
| M0 | Scaffold `assets/js/nqe/`, test harness | 0.5 h | low |
| M1 | `units`, `eigen`, `schrodinger1d` + tests | 2–3 h | highest |
| M2 | A1 | 2–3 h | medium |
| M3 | Extract `plot.js`, `ui.js` from A1 | 1 h | low |
| M4 | A5 | 3–4 h | high |
| M5 | A2 incl. spectator mode | 2 h | medium |
| M6 | A4 | 1 h | low |
| M7 | A6 | 1.5 h | low |
| M8 | `teaching.html` section + previews | 1 h | low |
| M9 | Presets, projector legibility, polish | 2 h | low |
| M10 | A3 | 2–3 h | medium |
| M11 | A7 | 1 h | low |

M0–M9 ≈ 16–19 h. A1, A2, A4, A6 share the solver, so marginal cost after A1 is
small; A5 needs its own machinery and is the real project. Build A5 second, not
last, so a surprise there surfaces early.

Cut order if time runs short: A7, A3, then A6 (folding a predicted-KIE readout
into A2 instead). A5 is not cuttable.

---

## 9. Decisions needed before M2

1. **Language.** `teaching.html` is entirely in German; these apps are for an
   international audience. This fixes every card, label and slider string, so
   settle it before any copy is written.
2. **Shared modules vs single files.** `assets/js/nqe/` breaks the repo's
   self-contained-file convention and prevents `file://` use. Alternative: one
   `assets/js/nqe/core.js` included by all apps, or an `esbuild --bundle` step
   producing standalone HTML for offline distribution.
3. **Whether A3 is built at all.**
