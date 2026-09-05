# NQE apps — implementation record

Seven browser apps for `cchembio.github.io`. Five share one 1D Schrödinger
solver; two (A3, A7) are standalone ring-polymer models with their own core
modules. Live under `apps/nqe_*.html`, shared modules under `js/nqe/`.

**Status: shipped.** All seven apps (A1, A5, A2, A4, A6, and — after an
initial round where they were cut for time — A3 and A7) are built, tested,
and merged into `teaching.html`. This document was originally a
forward-looking spec; it now records what was actually built and where the
build diverged from that spec, so treat it as as-built documentation, not a
plan to re-execute.

---

## Decisions, as settled

1. **Language** — English throughout, apps and `teaching.html` cards alike,
   even though the rest of the site (and the sections above this one on
   `teaching.html`) is German. Deliberate: these apps target an international
   audience.
2. **Shared modules** — `js/nqe/` (the repo's existing `js/` directory, not a
   new `assets/` tree as the original spec assumed), loaded as ES modules
   (`<script type="module" src="../js/nqe/…">`). No bundler. Consequence: the
   apps need to be served over http and do not run from `file://`.
3. **A3 and A7** — built, after initially being cut for time (both were
   optional in the original spec and first on its cut list). Standalone as
   specified: neither depends on the Schrödinger solver (`eigen.js`,
   `schrodinger1d.js`) the other five apps share. Each does, however, reuse
   `js/nqe/ui.js` and `js/nqe/plot.js` for sliders, presets, and line
   plots — "standalone" was read as "no shared *physics*", not "no shared UI
   plumbing", since duplicating the slider/preset/hash-state widgets would
   have bought nothing.

---

## Departures from the original spec

- **Shared CSS** lives in `css/nqe.css` (not repeated per app). It also holds
  a small set of `.eq-*` classes for rendering rate-equation cards (see A5,
  A2 below).
- **`js/nqe/pcet.js`** is a core module the original spec didn't anticipate:
  it holds the vibronic rate model (`well`, `psiAt`, `overlapAt`, `rateAt`,
  `rateGated`, `kie`) shared by A5 and A6, so A6 doesn't reimplement it.
- **`js/nqe/rates.js`** also gained `gaussHermite` and `gaussianAverage`
  (needed for A5/A6's gating average over R) and `units.js` gained
  `AU_TIME_S` / `auToPerSecond` (atomic-unit rates need converting to s⁻¹ for
  display). `rates.js` still has the spec's `tstZPE`, but nothing calls it —
  A2 computes the ZPE-corrected barrier inline instead (see A2 below).
- **A2's "spectator mode."** The original spec called for a spectator
  harmonic mode present in the reactant *and* at the barrier top, to avoid a
  circular ZPE correction. Worked through in review: a mode with the *same*
  frequency on both sides cancels exactly and contributes no ZPE effect at
  all — the spec's own stated goal ("avoid a circular correction") is what a
  literal spectator produces. What's implemented instead, and kept: the X–H
  stretch carries ½ħω in the reactant and *becomes* the reaction coordinate
  at the barrier top, so it contributes no ZPE there. This is the real,
  non-circular effect, and it's isotope-dependent (ω scales with reduced
  mass), which is what makes the ZPE-corrected KIE differ from 1. The slider
  is labelled "X–H stretch ν", not "spectator frequency", because that's the
  mode it actually controls.
- **A2 also gained**, over several rounds of review:
  - A "Semiclassical KIE — no tunneling" hero card: k_H/k_D from the ZPE
    correction alone, with tunneling switched off. Verified algebraically and
    by test that this equals exp[(ZPE_H − ZPE_D)/k_BT] exactly, independent
    of barrier height, width, and asymmetry (the classical prefactor k_BT/h
    carries no isotope mass), and reads ≈ 8.3 at ν = 3000 cm⁻¹, 298 K.
  - A "Rate expressions" equations card was added, then explicitly reverted
    on request — **do not re-add it**. The bottom-of-panel callout and note
    that were there originally were also removed on request and should stay
    removed.
  - A short explanation of the crossover temperature T_c = ħ|ω‡|/2πk_B,
    attached directly to the "Crossover T (H)" readout row rather than as a
    floating paragraph. The readout also now says explicitly when T_c falls
    outside the plotted T range (and why the dashed marker line is then
    absent), after that silence read as a bug during review.
- **A4 gained a well-asymmetry slider** the original spec didn't call for:
  in a *symmetric* double well ⟨x⟩ = 0 for every isotope by symmetry, so
  there is no geometric isotope effect to show without one.
- **A4's note** now flags that the real geometric isotope effect in hydrogen
  bonds involves the heavy-atom donor–acceptor coordinate responding to
  isotopic substitution — a relaxation this 1D proton model cannot represent.
  What A4 shows is the proton's own shift in an asymmetric well: a legitimate
  1D analogue, not the same observable.
- **A4's ⟨x⟩-vs-R sweep panel was uncached and cost ~800ms per render** —
  found by endurance testing, not by the original build or its unit tests.
  The panel resweeps 41 R-points × 2 isotopes (82 fresh Schrödinger solves),
  but only actually depends on the asymmetry slider, not on R itself — R just
  says where the marker sits on an already-computed curve. Dragging R alone
  was paying for the full resweep on every frame. Fixed by caching the sweep
  keyed on asymmetry (dragging R is now ~43ms) and halving the sweep
  resolution to 20 points, indistinguishable to the eye on this smooth a
  curve and roughly halving the cost of a genuine asymmetry change too.
- **A5's R → proton-displacement mapping was recalibrated.** The original
  spec's implicit 1:1 geometry (well separation `d = R − 2×dOH` for a fixed
  bond length dOH) produced a well separation of 1.0 Å at R = 3.0 Å against a
  ~0.1 Å ground-state width — an ungated KIE around 10⁵–10⁷, two to three
  orders of magnitude past where measured PCET kinetic isotope effects sit.
  `pcet.js` now uses a compliance model, `d(R) = d0 + geomSlope·(R − R0)`
  with `geomSlope = 0.75`, reflecting that part of any change in R is
  absorbed by the donor/acceptor bonds themselves relaxing (the same
  correlation behind why shorter, stronger hydrogen bonds come with longer,
  more delocalized X–H bonds) rather than by moving the proton. This puts the
  ungated KIE at R = 3.0 Å at ≈ 380 (target: 10²–10³), while the "strongly
  gated" preset still collapses it to ≈ 1.9 — still a striking, just no
  longer exaggerated, demonstration. Verified that the vibronic sum isn't
  silently truncating excited states: at 298 K the reactant μ=1 population is
  correctly Boltzmann-suppressed (≈ 9×10⁻⁷) while the (0,1) product channel
  still carries ≈ 3.6% of the rate via its own Franck–Condon factor.
- **A5 gained a "Rate expression" card** (kept, unlike A2's) showing the
  actual vibronic rate formula, a term table mapping each symbol to the
  slider that sets it, and a second formula for the gating average. Rendered
  in native **MathML** (`<math>`, `<mfrac>`, `<msqrt>`, `<munder>`), not
  hand-built HTML sub/sup spans — real fraction bars and summation limits,
  no external library, no CDN, styled from `css/nqe.css`. A2's "Rate
  expressions" card was deliberately *not* given the same treatment — that
  card was removed outright per the departure above.
- **A5/A6 gained a "measured PCET KIEs rarely exceed ~10²" note**, shown
  only when the current KIE exceeds 1000 — confirmed reachable (≈ 66,000) at
  the sliders' extreme corners, so it isn't dead code, and confirmed hidden
  under normal exploration of the default ranges.

---

## 1. Deliverables

| # | File | Status |
|---|---|---|
| A1 | `apps/nqe_proton_well.html` | shipped |
| A5 | `apps/nqe_pcet_overlap.html` | shipped |
| A2 | `apps/nqe_rate_models.html` | shipped |
| A4 | `apps/nqe_density.html` | shipped |
| A6 | `apps/nqe_predict_compare.html` | shipped |
| A3 | `apps/nqe_instanton.html` | shipped |
| A7 | `apps/nqe_thermometer.html` | shipped |

Plus: `js/nqe/*.js`, `css/nqe.css`, `images/apps/nqe_*.png`, `test/*.test.js`,
and a new "Nuclear quantum effects" section appended to `teaching.html`.

---

## 2. Repo conventions

- App files: `apps/`, snake_case, `.html`, no framework, no bundler.
- Previews: `images/apps/<appname>.png`, 1440×900, same aspect ratio as the
  existing previews.
- Palette, type scale and control layout follow `apps/euler_demo.html` and
  `apps/kinetics_demo.html`; no new visual language was introduced.
- **Departure from the single-file convention**: these five apps share a
  non-trivial solver, so common code lives in `js/nqe/*.js`, loaded as ES
  modules. The apps are therefore not self-contained and need `http://`, not
  `file://`.

Global UI requirements, all met:

- Legible at 1024×768 projection: body text ≥ 16 px, no hairline strokes
  (canvas line widths ≥ 2.5 px).
- H / D / T distinguished by line dash pattern as well as colour
  (`ISOTOPE` in `js/nqe/ui.js`: H solid, D long-dash, T short-dash).
- Visible keyboard focus (`:focus-visible`); `prefers-reduced-motion`
  respected in `css/nqe.css`.
- No `localStorage`. State lives in the URL hash (`hashState` in `ui.js`).
- Every app has a preset dropdown.

---

## 3. Core modules (`js/nqe/`)

### `units.js`

Atomic units internally; convert only at the display boundary.

```js
export const MASS = { H: 1836.152673, D: 3670.482967, T: 5496.921535 }; // m_e
export const BOHR_ANG, HARTREE_KJMOL, HARTREE_CM, HARTREE_EV, KB_HARTREE, HBAR;
export const AU_TIME_S = 2.4188843265857e-17;   // s per atomic unit of time — added for rate displays

export function angToBohr(x) / bohrToAng(x)
export function cmToHartree(e) / hartreeToCm(e)
export function kJmolToHartree(e) / hartreeToKJmol(e)
export function hartreeToEv(e)
export function kT(T)              // KB_HARTREE * T
export function auToPerSecond(k)   // atomic-unit rate -> s^-1, for display
```

### `eigen.js`

```js
export function symmetricEigen(A, n) // -> { values: Float64Array, vectors: Float64Array }
```

Householder reduction (`tred2`) plus implicit QL with shifts (`tqli`), as
specified. No external linear algebra dependency.

### `schrodinger1d.js`

```js
export function makeGrid({ xmin, xmax, n = 160 })
export function buildHamiltonian(grid, V, mass)
export function solve(grid, V, mass, nStates = 6)   // -> { E, psi }, psi sign-fixed (peak positive)
export function overlap(psiA, psiB, dx)
export function edgeAmplitude(psi, k = 3)
export function moments(psi, grid)   // -> { mean, width } — added for A4's ⟨x⟩ and density width
```

Sinc-DVR (Colbert–Miller) kinetic energy, as specified. Default `n = 160`,
solves in low-double-digit milliseconds warm (measured: A1's double-well
solve ≈ 11 ms at n=160 including potential construction) — under the 16
ms/frame target.

### `potentials.js`

```js
export function harmonic(grid, { omega, mass, x0 = 0 })          // + .levels(nMax)
export function morse(grid, { De, alpha, x0 = 0 })                // + .omega(), .nMaxBound(), .levels()
export function quarticDoubleWell(grid, { barrier, a, dE = 0 })   // + .stationary(), .minima(), .barrierTop()
export function eckart(grid, { V1, V2, omegaB, mass })            // + .transmission(E), .xMax, .vMax, .L
```

Formulas as specified in the original spec (still accurate — not reproduced
here). One addition: `quarticDoubleWell` exposes `.minima()` /
`.barrierTop()` with a fallback for `barrier = 0` (a linear potential has no
stationary point at all; A1 and A4 both hit this at their slider extremes and
would otherwise crash).

### `rates.js`

```js
export function tstClassical({ barrier, T })
export function tstZPE({ barrier, zpeReact, zpeTS, T })   // present, unused — A2 inlines this instead
export function wignerKappa({ omegaB, T })
export function thermalTransmission({ transmission, barrier, T, nQuad = 64 })
export function kie(kH, kD)
export function crossoverT({ omegaB })
export function gaussHermite(n)                            // added: 9-point nodes/weights for gating
export function gaussianAverage(f, mu, sigma, n = 9)        // added: Gaussian average via Gauss–Hermite
```

### `plot.js`

```js
export function createPlot(canvas, { xlabel, ylabel, pad })
```

Returns a fluent object: `.setLimits(xlim, ylim)`, `.setLabels()`, `.clear()`,
`.line()`, `.fillBetween()`, `.levels()`, `.vline()`, `.marker()`, `.text()`,
`.toPixel()` / `.fromPixel()`, `.draw()`. Matches the spec's intent; the exact
call signatures evolved during A1's build (M3) as planned.

### `ui.js`

```js
export function slider({ label, min, max, step, value, unit, decimals, onInput, id })
export function segmented({ label, options, value, onChange, ariaLabel })  // H/D/T toggles, mode toggles
export function presetSelect(presets, onSelect, id = 'preset')
export const hashState = { read(), write(obj) }
export function scheduleRecompute(fn)   // rAF throttle
export function onResize(fn)            // rAF-throttled resize -> redraw
export const ISOTOPE = { H: {...}, D: {...}, T: {...} }   // colour + dash pattern per isotope
```

`segmented` (not in the original spec) replaced ad hoc toggle-button code
after it turned out every app needed one (classical/quantum in A1, H/D/T
everywhere, isotope-shown-on-plot in A2/A5).

### `pcet.js` — not in the original spec

Vibronic PCET rate model, shared by A5 and A6:

```js
export const DEFAULTS = { De, omegaH, d0, geomSlope, Vel, nState }
export function well(iso, opt)         // cached Morse-well eigensolve per isotope/shape
export function psiAt(w, n, x)         // Catmull–Rom interpolation off-grid
export function overlapAt(w, mu, nu, d)
export function rateAt(iso, R, { dG, lam, T }, opt)   // -> { k, s00, d }
export function rateGated(iso, p, opt) // Gaussian average over R via gaussianAverage
export const kie = (p, opt) => rateGated('H', p, opt) / rateGated('D', p, opt)
```

See "A5's R → proton-displacement mapping was recalibrated" above for why
`d0`/`geomSlope` replaced a fixed per-side bond length.

### `instanton.js` — A3's standalone core, model units (mass = ħ = k_B = 1)

```js
export function potential(x, y, { A, a, ky, w, skew })   // double well x, coupled to a bump in y
export function gradient(x, y, p)                         // [dV/dx, dV/dy]
export function crossoverT({ A, a })                       // T_c = 2a√A / 2π — independent of skew, ky
export function relaxInstanton(p, { T, N = 32, steps, step })
  // -> { path: [{x,y}, ...], action, extent, maxDeviation }
```

`relaxInstanton` is plain steepest descent on the discretized Euclidean
action of an N-bead ring, exactly as specified — but with one addition the
spec didn't anticipate: after every step, the ring is projected back onto
its expected mirror symmetry (`x[i] = -x[i+N/2]`, `y[i] = y[i+N/2]`). Without
that, floating-point noise eventually breaks the symmetry and, given enough
iterations, plain gradient descent slides the whole "collapsed above T_c"
ring off the (unstable) saddle and into one of the wells — the genuine
long-run attractor of unconstrained steepest descent on this surface, and
the wrong physics for a demo about the saddle. The projection is a no-op on
the genuine below-T_c instanton (which already has that symmetry), so it
only removes the failure mode, never distorts a real solution.

### `thermometer.js` — A7's standalone core, model units

```js
export function potential(x, { kind, k })         // harmonic or quartic
export function force(x, { kind, k })
export function simulate({ kind, k, T, mass, N = 32, targetTime, dt, friction, seed })
  // -> { meanX2, Rg2, beads }
export function exactHarmonicX2({ mass, omega, T })  // closed form, for validation
export function classicalX2({ mass, omega, T })      // equipartition limit
```

Not a straightforward port of the spec's one-line description ("bead cloud
... radius of gyration"). The first implementation used explicit-Euler
Langevin dynamics directly on bead positions and failed outright: the ring's
spring coupling stiffens as `N·T`, so a timestep stable at low T diverges at
high T, while the centroid mode has *no* spring restoring force at all and
only equilibrates on the potential's own far slower timescale — the same
system is simultaneously stiff and slow, and no fixed timestep serves both.
`simulate` instead transforms to the ring's normal modes (a real orthogonal
basis, precomputed once per N and cached) and advances the free-ring part
with its exact, unconditionally-stable Ornstein–Uhlenbeck propagator, Strang-
split around an explicit real-space kick from the actual (possibly
anharmonic) potential. This is the standard PIMD technique for exactly this
problem, not an exotic addition. Validated against
`exactHarmonicX2` to a few percent; see §7.

Two things worth knowing if this gets extended:
- `Rg2` (radius of gyration about the ring's own centroid) and `meanX2`
  (total position variance) have *opposite* T-dependence: `Rg2` shrinks
  monotonically as T rises (springs stiffen, the ring collapses toward a
  classical point — the intended "thermometer" signal), while `meanX2` grows
  with T (more thermal energy explores more of an unbounded well, classically
  and quantum-mechanically alike). The app plots `Rg`, not `meanX2`, deliberately.
- `render()` in the app can block the main thread for several seconds
  (rebuilding all three isotope curves). Segmented-control clicks update
  their DOM state synchronously but the browser can't paint that until the
  blocking script yields, so the heavy work is deferred one macrotask via
  `setTimeout` (not `requestAnimationFrame`, which runs before paint and so
  doesn't help here) — otherwise a slow recompute looks exactly like a
  dropped click.

---

## 4. App specs, as built

### A1 `nqe_proton_well.html`

Potential: `quarticDoubleWell`. Controls: Barrier height (0–60 kJ/mol), Well
separation 2a (0.4–1.6 Å), Asymmetry ΔE (−20–+20 kJ/mol), Isotope (H/D/T),
Classical-point ↔ Quantum-wave toggle (given top visual weight, as specified).
Presets: symmetric deep barrier / symmetric shallow / strongly asymmetric.

Shows the lowest 6 levels drawn inside the potential, |ψ|² for a
user-selected number of states (defaults to ν=0 only), zero-point energy,
splitting E₁−E₀ in cm⁻¹ (with a derived "as a period" readout), density
width, and ⟨x⟩ − x_min. Classical mode draws a point at the lowest classical
minimum instead of a density. Near-degenerate levels are grouped under one
label on the plot rather than overprinted.

Verified: deep-barrier preset gives an H/D splitting ratio of ≈ 109 (order of
magnitude satisfied many times over); full solve ≈ 9 ms; edge-amplitude
warning fires correctly at the shallow/wide slider extremes and stays silent
elsewhere.

### A5 `nqe_pcet_overlap.html`

Two mirrored Morse proton wells (`js/nqe/pcet.js`), separated by a distance
`d(R)` derived from the donor–acceptor slider R via the recalibrated geometry
model (see departures above, not the original spec's 1:1 mapping). Controls:
Distance R (2.4–3.2 Å), ΔG° (−100–+50 kJ/mol), λ (20–200 kJ/mol), Gating
amplitude (0–0.3 Å), Temperature (200–400 K), isotope shown (H/D). Presets:
short distance / long distance / strongly gated.

Layout matches the spec: the shaded overlap panel is the largest and
primary visual; rate, KIE, and coupling are secondary numeric readouts in a
hero card. Also present, beyond the original spec: a "Rate expression" card
(native MathML, see departures above) with a term-to-slider table and a
second formula for the gating average; a >1000 KIE caveat note; a box-too-
small warning tied to the cached wells' edge amplitude.

Verified: log₁₀k vs R has r² > 0.97 over the slider range (near-linear, with
mild curvature from higher vibronic channels turning on — not perfectly
linear, which the original acceptance criterion didn't anticipate); KIE
increases monotonically with R; ungated KIE at R = 3.0 Å lands at ≈ 380
(target 10²–10³); a full rate evaluation is well under 1 ms.

### A2 `nqe_rate_models.html`

Potential: `eckart`. Four curves on an Arrhenius plot plus a KIE(T) panel:
classical TST, ZPE-corrected TST, Wigner, Eckart (exact, thermally averaged).
Controls: Barrier height (20–120 kJ/mol), Barrier frequency |ω‡| (200–2000
cm⁻¹), Reaction asymmetry (−40–+40 kJ/mol), X–H stretch ν (500–3500 cm⁻¹,
the reworked "spectator mode" — see departures above), T range (T-from
150–350 K, T-to 300–700 K). Presets: above the crossover / below the
crossover / large tunneling KIE.

Beyond the original spec: a "Semiclassical KIE — no tunneling" hero card; a
crossover-temperature explanation attached to its readout row, including an
explicit "(below/above plotted range)" note when the marker line is off-
screen. Does **not** have a rate-equations card — one was added and then
explicitly reverted; the original bottom-panel callout/note were removed and
should stay removed.

Verified: Wigner and Eckart-exact coincide to within 15% at 8×T_c and diverge
by many orders of magnitude (tested floor: >100×, actual is far higher) at
0.6×T_c; classical TST's prefactor is exactly mass-independent
(A_H/A_D = 1.000000); semiclassical KIE at ν=3000 cm⁻¹, 298 K ≈ 8.33,
matching exp[(ZPE_H−ZPE_D)/k_BT] to within the isotope-scaled-frequency
calculation (ω_D = ω_H·√(μ_H/μ_D), confirmed already using the correct
heavy-X reduced-mass limit, not the bare isotope mass, though for a heavy X
those coincide).

### A4 `nqe_density.html`

Reuses A1's solver via `quarticDoubleWell`, with barrier and well separation
both parameterized by a donor–acceptor distance R (`Vb = 140(R−2.35)² kJ/mol`,
`2a = R−2.00 Å`, both stated in-app as illustrative, not fitted). Controls:
Donor–acceptor distance R (2.4–3.0 Å), Well asymmetry (0–20 kJ/mol — added
beyond the original spec, see departures above). Presets: short / long
hydrogen bond.

Shows |ψ₀|² for H and D on a shared potential/scale, density width for each,
⟨x⟩ for each against the classical minimum, and the H−D difference in ⟨x⟩
labelled as the geometric isotope effect — with a note (added on review)
caveating that this is the proton's own shift, not the heavy-atom donor–
acceptor relaxation a real GIE also involves.

### A6 `nqe_predict_compare.html`

Forward model only, reusing `js/nqe/pcet.js` (A5's model) rather than a
duplicate. Controls: Proton well depth (200–600 kJ/mol), X–H stretch ν
(2000–3600 cm⁻¹), Distance R (2.4–3.2 Å), ΔG° (−100–+50 kJ/mol), λ
(20–200 kJ/mol), Gating amplitude (0–0.3 Å), Temperature (200–400 K), plus
three plain number inputs for a user-entered measured KIE/T/R to overlay.
Presets: moderate KIE gated / large tunneling KIE / weak KIE short bond.

Outputs: predicted KIE (hero number), KIE(T) and KIE(R) on log-scale axes
(the original spec's linear axes couldn't show the several-orders-of-
magnitude range these curves actually span), both with the measured value
overlaid as a hollow square marker. A >1000 KIE caveat note, matching A5's.
No inverse-direction (measured → mechanistic conclusion) functionality, as
specified.

### A3 `nqe_instanton.html`

Built after initially being cut for time. Standalone (`js/nqe/instanton.js`,
no dependency on the Schrödinger solver). A symmetric double well along a
reaction coordinate x, coupled to a transverse harmonic mode y whose
equilibrium position bulges near the barrier (`g(x) = skew·exp(-(x/w)²)`) —
substituting y = g(x) collapses the surface back to the bare double well, so
the saddle and both minima always sit exactly on that curve regardless of
skew, and the barrier-top curvature (hence T_c) is provably independent of
skew too. Controls, exactly as specified: Temperature (0.1–2.5) and Surface
skew (0–1.5). Presets: above the crossover / deep tunneling with corner-
cutting / flat valley (skew = 0, a no-cutting control case).

Renders the potential as a rasterized heatmap (`createPlot` has no heatmap
primitive, so this composites a canvas image `destination-over` the plot's
own grid/frame/lines — the one thing worth knowing if this pattern gets
reused: `plot.js`'s `draw()` clears the canvas unconditionally, so a
manually-drawn background has to go in *after* `draw()`, not before it),
with the minimum-energy path, the 32-bead ring, and the saddle/minima
markers overlaid; a second panel plots path extent against T with T_c
marked, cheap enough to recompute on every slider change (a few ms).

Verified: T_c independent of skew to machine precision; above T_c the ring
collapses to the saddle (extent, corner-cutting deviation both → 0) and
*stays* there regardless of how long it runs (the mirror-symmetry projection
in `instanton.js` is what makes this robust — see §3); below T_c a genuine
extended path survives and shortens monotonically as T rises toward T_c;
corner-cutting deviation is exactly zero when skew = 0 and substantial
(> 0.1, half the well separation) when skew > 0 deep below T_c; the
converged path is mirror-symmetric to floating-point precision.

### A7 `nqe_thermometer.html`

Built after initially being cut for time. Standalone (`js/nqe/thermometer.js`).
Harmonic or quartic single well; H/D/T isotope selector using the real mass
ratios (1 : 1.9968 : 2.9901) as plain constants, since this app doesn't pull
in the shared unit registry. Controls: Well (Harmonic/Quartic), Isotope
(H/D/T), Temperature — stepped so it only ever lands on one of 11
precomputed grid points (see below). Presets: cold/deep-quantum-regime,
warm/near-classical, quartic well.

Radius of gyration is plotted against temperature for all three isotopes at
once (H/D/T curves, current isotope highlighted); a second panel shows the
actual final bead configuration from one fresh sample against the well, at
the current (snapped) temperature. The hero number is the T → 0 zero-point
floor for the current isotope — the single most informative summary of "how
quantum" that isotope looks in this well.

Performance-driven design departures from a naive "resimulate on every
interaction" approach: the three Rg(T) curves depend only on {well kind},
so they're built once and cached, rebuilt only when the well toggles (not
on temperature drags or isotope switches, both of which are then instant
lookups/redraws against the cached curves) — recomputing all three curves
costs a few seconds even with the exact normal-mode integrator, since each
of the 33 (3 isotopes × 11 T-points) samples still needs real Monte Carlo
averaging. The temperature slider's `step` is set to the exact grid
spacing, so the displayed T and the readout's T can never disagree (an
earlier "nearest grid point" version could silently show numbers for a
different T than the slider displayed).

Verified: sampled ⟨x²⟩ matches the exact quantum harmonic-oscillator formula
to 3–15% (Monte Carlo, deep-quantum and classical-limit regimes both
checked); the exact and classical formulas agree to <2% at high T, while at
T = 0.02 the exact formula sits within 1% of the analytic zero-point floor
1/(2mω) and the classical prediction has fallen to under a tenth of that
floor — confirming the saturation is real, not a units error; Rg grows
monotonically as T falls at fixed mass and shrinks monotonically as mass
grows at fixed T; the quartic well stays finite and shrinks with increasing
stiffness.

---

## 5. Presets and state — as built

Every app has a preset `<select>` and writes full parameter state to
`location.hash` on every committed change (`hashState.write`), read back on
load with preset defaults as fallback. Verified round-trip: selecting a
preset, reading the resulting hash, and reloading the app at that hash URL
reproduces the same hash.

Actual preset sets (differ slightly from the original spec's placeholders):

- A1: `deep` (symmetric, deep barrier) / `shallow` (symmetric, shallow) / `asym` (strongly asymmetric)
- A2: `above` (above the crossover) / `below` (below the crossover) / `bigk` (large tunneling KIE)
- A5: `short` / `long` (donor–acceptor distance) / `gated` (strongly gated)
- A4: `short` / `long` (hydrogen bond)
- A6: `moderate` (KIE, gated) / `large` (tunneling KIE) / `weak` (KIE, short bond)
- A3: `above` (above the crossover) / `deep` (deep tunneling, corner-cutting) / `flat` (flat valley, skew = 0)
- A7: `cold` (deep quantum regime) / `warm` (near-classical) / `quartic` (quartic well)

Boundary check present in every solver-based app (A1, A4, A5): if
`edgeAmplitude(psi) > 1e-4`, a visible warning fires that the box is too
small and the levels are unconverged. A3 and A7 don't use this check — they
have no comparable "box too small" failure mode — but A7's compute-heavy
recomputes get their own "Computing…" indicator instead (see §3).

---

## 6. `teaching.html`

A "Nuclear quantum effects" section was appended after the Quantenchemie
(QC) section, badge `NQE`, structurally identical to the sections above it
(verified: same CSS class set on every element, checked programmatically).
Per the language decision, its copy is in English while the rest of the page
stays German — the original spec's table of German-adjacent titles was
superseded by that decision. Actual card titles/category lines:

| App | Title | Category line |
|---|---|---|
| A1 | Proton in a potential | Zero-point energy, delocalization & tunneling |
| A5 | PCET as an overlap problem | Vibronic coupling & nonadiabatic rates |
| A2 | Rate models compared | Transition state theory & tunneling corrections |
| A4 | Quantum vs point-particle proton | Nuclear wavefunctions & geometric isotope effects |
| A6 | Model prediction vs measurement | Kinetic isotope effects from a model |
| A3 | Instanton paths | Deep tunneling & the crossover temperature |
| A7 | Quantum thermometer | Zero-point delocalization & the classical limit |

A3's row matches the original spec's suggested title/category exactly. A7's
is new — the original spec didn't propose card copy for it.

---

## 7. Tests

`node --test test/*.test.js` — 41 tests across four files, all passing.

**`test/core.test.js`** (13 tests) — solver fundamentals, run before anything
visual was built, per the original plan:
unit round-trips; `symmetricEigen` against a known spectrum; harmonic
oscillator to 1e-8 relative error; particle-in-a-box (n² spectrum + wall-
corrected ground state, since a finite-wall box isn't the idealized infinite
one); Morse against its closed form; `overlap()` self-normalization;
symmetric double-well splitting vs. WKB; H≫D splitting in the deep-barrier
limit; Eckart geometry/curvature/`V(x_max)`; Eckart transmission limits,
half-height, and V1↔V2 symmetry; thermal transmission (classical step ≡ 1,
Eckart exceeds Wigner below T_c); `tstClassical`'s Arrhenius slope recovers
`barrier + k_BT`; Gauss–Hermite quadrature reproduces Gaussian moments.

**`test/models.test.js`** (15 tests) — the per-app acceptance criteria from
§4, plus regressions added during review:
A1's H/D splitting ratio and sub-16ms solve time; A1's edge-warning
correctness; A5's log-linear R-dependence, monotonic KIE(R), gating's
rate-boost/KIE-collapse, cached-well convergence, sub-16ms rate evaluation;
A2's mass-independent barrier width for one electronic potential (and its
legitimate mass-*dependence* once ZPE-corrected); A2's Wigner-vs-exact
crossover behavior; A2's mass-independent classical prefactor; A2's
ZPE-only-KIE-is-Arrhenius-linear vs. exact-KIE-curves; A2's semiclassical
KIE ≈ 8.3 / prefactor ratio ≡ 1 regression (added after the isotope-scaling
review); A5's recalibrated-geometry KIE-in-range regression; A5's vibronic-
channel-not-truncated regression (added after the overlap-magnitude review).

**`test/instanton.test.js`** (7 tests) — `crossoverT` independent of skew;
saddle and both minima are genuine stationary points for any skew; the ring
collapses to the saddle above T_c and *stays* there under 4× more iterations
(the regression the mirror-symmetry projection exists to prevent); an
extended path survives below T_c and shortens monotonically toward T_c;
corner-cutting deviation is exactly zero at skew = 0 and substantial at
skew > 0; the converged path is mirror-symmetric to floating-point
precision; stays finite and bounded at the slider extremes.

**`test/thermometer.test.js`** (6 tests) — sampled ⟨x²⟩ matches the exact
quantum harmonic formula in both the deep-quantum and classical regimes;
exact and classical formulas agree at high T; the zero-point floor is
real (exact ≈ floor, classical ≪ floor, at T → 0); Rg grows as T falls at
fixed mass; Rg shrinks as mass grows at fixed T; the quartic well stays
finite and shrinks with stiffness.

**Endurance testing** (ad hoc scripts, not part of `test/*.test.js`) pushed
past the numbers above on two axes: iteration count and interactive-session
length.
- A3's `relaxInstanton` at 20× its production step budget (200,000 steps)
  across the full T/skew grid, and at 100× (1,000,000 steps) right at the
  exact crossover temperature — the theoretically slowest-converging point.
  Stayed finite, mirror-symmetric, and collapsed exactly to the saddle above
  T_c with no drift, confirming the fix in §3 generalizes rather than just
  covering the app's specific default.
- A7's `simulate` at up to 100× its production `targetTime`, confirming the
  sampled ⟨x²⟩ converges monotonically toward the exact formula as the run
  lengthens (6.4% → 4.8% → 1.4% → 0.5% error across a 100× range) rather than
  plateauing at a biased value — the signature of an honest estimator, not
  a broken one that happens to look reasonable.
- All seven apps driven through 60–80 cycles of slider drags, preset
  switches, and mode toggles (fewer for A7, whose well/isotope switch is
  itself expensive), watching JS heap size and accumulated console errors.
  Zero heap growth and zero errors across all seven. This is what surfaced
  the A4 finding two paragraphs above — a real, previously unknown
  performance bug, not caught by any correctness test because the numbers
  it produced were always correct, just slow to arrive.

---

## 8. What actually shipped, vs. the original build order

The original spec's M0–M11 table and hour estimates are no longer
forward-looking; recorded here for history only. M0–M9 shipped first (A1,
A5, A2, A4, A6, core modules, tests, `teaching.html` section, presets/
polish); M10 (A3) and M11 (A7) were cut at that point, matching the original
cut order's advice to drop them first if time ran short. Both were built in
a later pass. A5 was in fact built second within the first pass (per the
original plan's advice to surface its risk early), and its risk did
materialize — not in the machinery itself, but in the R-geometry calibration,
caught and fixed during review rather than during the initial build.

Contrary to the original spec's assumption that A5 wasn't cuttable: it
shipped, but needed a follow-up recalibration pass after initial delivery to
bring its numbers into a physically plausible range. Worth knowing for any
future app in this set that maps a UI slider onto a microscopic length scale
via an ad hoc geometric formula — check the resulting numbers against known
physical ranges before considering it done, not just that the code runs.

A3 and A7, built later, turned out to be the riskiest apps in the whole set
by a wide margin — the opposite of their "optional, cut first" billing. Both
needed a real numerical-methods fix discovered only by validating against
known physics, not by getting the code to run without errors:
- A3's plain steepest descent ran, produced plausible-looking output, and
  was *wrong* in a way only visible over many more iterations than a first
  check used — it eventually slid off the saddle into one well, since an
  unconstrained ring polymer's only true long-run attractor above T_c is a
  collapsed classical minimum, not the saddle. Caught by deliberately running
  far past the planned iteration budget during review, not by the budget
  itself.
- A7's first integrator (explicit-Euler Langevin, directly on bead
  positions) diverged to `NaN` at higher T, and a naive fix (shrinking the
  timestep) traded that for a *different* failure — correct but impossibly
  slow, since the same system's centroid mode needs a large timestep while
  its spring modes need a small one. Solved only by switching to an exact
  per-normal-mode propagator, the standard PIMD technique for exactly this
  stiffness mismatch, not a smaller-step workaround.

Neither failure mode showed up as an error message or a crash; both looked
like working code that happened to produce numbers. The lesson generalizes
past this project: for any app that samples or extremizes over many
iterations, "it ran and produced a plausible number" is not evidence of
correctness — validate against a known closed-form limit (as both apps'
tests now do) before trusting the output, and specifically re-check behavior
under *more* iterations than planned, not fewer, since some failure modes
only appear given enough time to develop.

---

## 9. Decisions — resolved

All three items the original spec listed as "needed before M2" were
resolved during the build (language: English; shared modules: `js/nqe/`, no
bundler; A3: built, in a later pass — see §8) — see "Decisions, as settled"
at the top of this document.
