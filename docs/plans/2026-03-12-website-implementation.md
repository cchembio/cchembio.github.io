# cchembio.github.io Static Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete 9-page static academic website for the Computerchemie und Biochemie research group hosted on GitHub Pages.

**Architecture:** Pure HTML/CSS/JS, no framework, no build step. One shared `css/style.css` and one `js/main.js`. All pages share the same `<header>` nav and `<footer>` markup. Content sourced from the university website (already fetched and available in the design doc).

**Tech Stack:** HTML5, CSS3 (custom properties, flexbox, grid), vanilla JS (ES6). No dependencies.

**Design doc:** `docs/plans/2026-03-12-website-design.md`

---

## Shared HTML Template

Every page uses this skeleton (substitute `<TITLE>` and `<BODY_CONTENT>`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><TITLE> — Computerchemie und Biochemie</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <nav class="navbar">
      <a href="index.html" class="nav-brand">Computerchemie und Biochemie</a>
      <button class="nav-toggle" aria-label="Toggle navigation">&#9776;</button>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="research.html">Research</a></li>
        <li><a href="members.html">Members</a></li>
        <li><a href="publications.html">Publications</a></li>
        <li><a href="software.html">Software</a></li>
        <li><a href="teaching.html">Teaching</a></li>
        <li><a href="links.html">Links</a></li>
        <li><a href="https://github.com/cchembio" target="_blank" rel="noopener">GitHub ↗</a></li>
      </ul>
    </nav>
  </header>

  <main class="container">
    <BODY_CONTENT>
  </main>

  <footer>
    <div class="container footer-inner">
      <div>
        <strong>Prof. Dr. Ricardo Mata</strong><br>
        Institut für Physikalische Chemie<br>
        Georg-August-Universität Göttingen<br>
        Tammannstraße 6, 37077 Göttingen, Germany<br>
        Phone: +49-(551) 39-23149 &nbsp;|&nbsp;
        Email: <a href="mailto:rmata@gwdg.de">rmata@gwdg.de</a>
      </div>
      <div>
        <a href="https://www.uni-goettingen.de/de/123987.html" target="_blank" rel="noopener">
          University page ↗
        </a>
      </div>
    </div>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>
```

---

### Task 1: css/style.css — Complete shared stylesheet

**Files:**
- Create: `css/style.css`

**Step 1: Create the CSS file with all styles**

```css
/* ============================================================
   CSS Custom Properties
   ============================================================ */
:root {
  --blue:       #003d73;
  --blue-dark:  #002a50;
  --gold:       #c8a951;
  --bg:         #ffffff;
  --text:       #1a1a1a;
  --muted:      #555555;
  --border:     #dde3ea;
  --max-width:  1100px;
  --radius:     4px;
}

/* ============================================================
   Reset & Base
   ============================================================ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; scroll-behavior: smooth; }

body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.7;
}

h1, h2, h3, h4 {
  font-family: Georgia, "Times New Roman", serif;
  color: var(--blue);
  line-height: 1.3;
}

h1 { font-size: 2rem;   margin-bottom: 0.75rem; }
h2 { font-size: 1.5rem; margin-bottom: 0.6rem;  border-bottom: 2px solid var(--gold); padding-bottom: 0.25rem; }
h3 { font-size: 1.15rem; margin-bottom: 0.4rem; }

p  { margin-bottom: 1rem; }
a  { color: var(--blue); text-decoration: none; }
a:hover { text-decoration: underline; color: var(--gold); }

ul, ol { padding-left: 1.25rem; margin-bottom: 1rem; }
li { margin-bottom: 0.25rem; }

/* ============================================================
   Layout
   ============================================================ */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

main.container { padding-top: 2.5rem; padding-bottom: 3rem; }

/* ============================================================
   Navigation
   ============================================================ */
header {
  background: var(--blue);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}

.navbar {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.nav-brand {
  color: #fff;
  font-family: Georgia, serif;
  font-size: 1.05rem;
  font-weight: bold;
  white-space: nowrap;
}
.nav-brand:hover { text-decoration: none; color: var(--gold); }

.nav-links {
  list-style: none;
  display: flex;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
}

.nav-links a {
  color: rgba(255,255,255,0.88);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.nav-links a:hover,
.nav-links a.active {
  background: rgba(255,255,255,0.12);
  color: #fff;
  text-decoration: none;
}

.nav-toggle {
  display: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

/* ============================================================
   Footer
   ============================================================ */
footer {
  background: var(--blue-dark);
  color: rgba(255,255,255,0.8);
  padding: 2rem 0;
  margin-top: 4rem;
  font-size: 0.88rem;
  line-height: 1.8;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
}

footer a { color: var(--gold); }
footer a:hover { color: #fff; }
footer strong { color: #fff; }

/* ============================================================
   Home page — two-column layout
   ============================================================ */
.home-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 3rem;
  align-items: start;
}

.highlights {
  background: #f4f7fb;
  border-left: 4px solid var(--gold);
  padding: 1.25rem 1.5rem;
  border-radius: 0 var(--radius) var(--radius) 0;
  margin-top: 2rem;
}

.highlights h3 { color: var(--blue); margin-bottom: 0.5rem; }

.contact-card {
  background: #f4f7fb;
  border: 1px solid var(--border);
  border-top: 4px solid var(--blue);
  padding: 1.5rem;
  border-radius: var(--radius);
  font-size: 0.92rem;
  line-height: 1.9;
}

.contact-card h3 {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  border: none;
}

/* ============================================================
   Research page
   ============================================================ */
.research-section {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}
.research-section:last-child { border-bottom: none; }

.research-section .key-publications {
  background: #f9fafb;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: 0.88rem;
  margin-top: 0.75rem;
}
.research-section .key-publications li { margin-bottom: 0.15rem; }

/* ============================================================
   Members page
   ============================================================ */
.members-group { margin-bottom: 2.5rem; }
.members-group h2 { margin-bottom: 1rem; }

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.member-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  background: #fafafa;
}

.member-card h3 { font-size: 1rem; margin-bottom: 0.2rem; color: var(--blue); }
.member-card .role { color: var(--muted); font-size: 0.85rem; margin-bottom: 0.5rem; font-style: italic; }
.member-card .details { font-size: 0.88rem; line-height: 1.7; }
.member-card .details a { word-break: break-all; }

/* Leader card gets a slightly more prominent style */
.member-card.leader {
  border-top: 4px solid var(--blue);
  background: #f4f7fb;
}

/* ============================================================
   Publications page
   ============================================================ */
.pub-year { margin-bottom: 2.5rem; }
.pub-year h2 { font-size: 1.3rem; margin-bottom: 1rem; }

.pub-list {
  list-style: none;
  padding: 0;
}

.pub-list li {
  padding-left: 1.5rem;
  text-indent: -1.5rem;
  margin-bottom: 0.9rem;
  font-size: 0.92rem;
  line-height: 1.6;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.8rem;
}

.pub-list li:last-child { border-bottom: none; }

.pub-title { font-style: italic; }
.pub-doi { font-size: 0.82rem; margin-left: 0.25rem; }

/* ============================================================
   Software page
   ============================================================ */
.software-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.software-card {
  border: 1px solid var(--border);
  border-top: 4px solid var(--blue);
  border-radius: var(--radius);
  padding: 1.5rem;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.software-card h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }
.software-card .meta { font-size: 0.82rem; color: var(--muted); margin-bottom: 0.75rem; }
.software-card p { font-size: 0.92rem; }
.software-card .links { margin-top: 1rem; font-size: 0.88rem; }
.software-card .links a { margin-right: 1rem; }

/* ============================================================
   Links & Teaching — simple
   ============================================================ */
.link-group { margin-bottom: 2rem; }
.link-group h3 { margin-bottom: 0.5rem; }
.placeholder-note {
  background: #f4f7fb;
  border: 1px solid var(--border);
  padding: 2rem;
  border-radius: var(--radius);
  color: var(--muted);
  text-align: center;
}

/* ============================================================
   Page header strip
   ============================================================ */
.page-header {
  border-bottom: 2px solid var(--border);
  margin-bottom: 2rem;
  padding-bottom: 1rem;
}
.page-header h1 { margin-bottom: 0.25rem; }
.page-header p { color: var(--muted); margin: 0; }

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 768px) {
  .nav-toggle { display: block; }

  .nav-links {
    display: none;
    flex-direction: column;
    gap: 0;
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    background: var(--blue);
    padding: 0.5rem 0;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  .nav-links.open { display: flex; }

  .nav-links a {
    padding: 0.65rem 1.5rem;
    border-radius: 0;
    display: block;
  }

  .home-grid { grid-template-columns: 1fr; }

  .member-grid { grid-template-columns: 1fr; }

  .software-cards { grid-template-columns: 1fr; }

  .footer-inner { flex-direction: column; }
}
```

**Step 2: Verify file exists**

```bash
ls -lh css/style.css
```

Expected: file ~7–8 KB.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add shared stylesheet with Göttingen blue academic design"
```

---

### Task 2: js/main.js — Mobile nav toggle

**Files:**
- Create: `js/main.js`

**Step 1: Create the JS file**

```js
// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links  = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // Close nav when a link is clicked (mobile UX)
  if (links) {
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
      });
    });
  }
});
```

**Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: add mobile nav toggle"
```

---

### Task 3: index.html — Home page

**Files:**
- Create: `index.html`

**Step 1: Create index.html**

Use the shared template. Body content:

```html
<div class="page-header">
  <h1>Computerchemie und Biochemie</h1>
  <p>Research Group of Prof. Dr. Ricardo Mata — Georg-August-Universität Göttingen</p>
</div>

<div class="home-grid">
  <div class="home-main">
    <p>
      Welcome to the website of the Computational Chemistry and Biochemistry group
      at the <a href="https://www.uni-goettingen.de" target="_blank" rel="noopener">
      Georg-August-Universität Göttingen</a>, Institut für Physikalische Chemie.
      Our group develops and applies quantum chemical methods to investigate
      chemical reactivity and biomolecular processes.
    </p>
    <p>
      We work at the interface of method development and application, with particular
      focus on local correlation methods, QM/MM approaches for enzymatic systems,
      and the accurate description of non-covalent interactions. A central theme is
      the use of high-level wavefunction theory to achieve quantitative accuracy in
      the study of complex chemical systems.
    </p>
    <p>
      Our group is part of the Institut für Physikalische Chemie and collaborates
      closely with experimental groups in Göttingen and internationally.
    </p>

    <div class="highlights">
      <h3>Research Highlights</h3>
      <ul>
        <li>
          <strong>qmbench / GöBench:</strong> We coordinate benchmark efforts for numerical
          quantum chemistry, including the
          <a href="https://www.uni-goettingen.de/de/forschung/123988.html" target="_blank" rel="noopener">
          qmbench initiative</a> and participation in the HyDRA blind challenge for
          computational vibrational spectroscopy.
        </li>
        <li>
          <strong>BENCh RTG2455:</strong> Prof. Mata is a principal investigator in the
          <a href="https://www.uni-goettingen.de/de/bench/560231.html" target="_blank" rel="noopener">
          BENCh Research Training Group (RTG 2455)</a>, which focuses on
          benchmark experiments for numerical quantum chemistry.
        </li>
        <li>
          <strong>SFB 1633:</strong> The group participates in collaborative research
          on reactive intermediates and reaction mechanisms (SFB 1633).
        </li>
      </ul>
    </div>
  </div>

  <aside>
    <div class="contact-card">
      <h3>Contact</h3>
      <strong>Prof. Dr. Ricardo Mata</strong><br>
      Institut für Physikalische Chemie<br>
      Georg-August-Universität Göttingen<br>
      Tammannstraße 6<br>
      37077 Göttingen, Germany<br>
      <br>
      <strong>Office:</strong> Room 4.125<br>
      <strong>Phone:</strong> +49-(551) 39-23149<br>
      <strong>Email:</strong>
      <a href="mailto:rmata@gwdg.de">rmata@gwdg.de</a><br>
      <br>
      <a href="https://www.uni-goettingen.de/de/123987.html" target="_blank" rel="noopener">
        University page ↗
      </a><br>
      <a href="https://github.com/cchembio" target="_blank" rel="noopener">
        GitHub ↗
      </a>
    </div>
  </aside>
</div>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add home page with group intro and contact sidebar"
```

---

### Task 4: research.html — Research areas

**Files:**
- Create: `research.html`

**Step 1: Create research.html**

Use the shared template. Body content:

```html
<div class="page-header">
  <h1>Research</h1>
  <p>Main areas of investigation in computational chemistry and biochemistry</p>
</div>

<section class="research-section">
  <h2>Enzymatic Systems</h2>
  <p>
    A central theme of our research is the application of high-level quantum chemical
    methods to the study of biochemical processes. We use QM/MM (quantum mechanics /
    molecular mechanics) approaches to treat enzyme active sites at the quantum level
    while describing the surrounding protein environment with classical force fields.
    This allows us to obtain quantitatively accurate results for enzyme reaction mechanisms
    with full account of the protein environment.
  </p>
  <p>
    Current interests include the role of proton transfer steps in catalysis,
    allosteric communication in multimeric enzymes, and the chemistry of naturally
    occurring covalent crosslinks in proteins. Recent highlights include the
    characterization of low-barrier hydrogen bonds in enzyme cooperativity
    (Nature 573, 609–613, 2019) and the discovery of widespread lysine–cysteine
    redox switches (Nature Chemical Biology 18, 368–375, 2022).
  </p>
  <div class="key-publications">
    <strong>Key publications:</strong>
    <ul>
      <li>Dai et al., <em>Nature</em> 573, 609–613 (2019) —
        <a href="https://doi.org/10.1038/s41586-019-1581-9" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Wensien et al., <em>Nature</em> 593, 460–464 (2021) —
        <a href="https://doi.org/10.1038/s41586-021-03513-3" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Rabe von Pappenheim et al., <em>Nat. Chem. Biol.</em> 18, 368–375 (2022) —
        <a href="https://doi.org/10.1038/s41589-021-00966-5" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Schrader et al., <em>Science</em> 353, 594–598 (2016) —
        <a href="https://doi.org/10.1126/science.aaf8993" target="_blank" rel="noopener">DOI</a>
      </li>
    </ul>
  </div>
</section>

<section class="research-section">
  <h2>Reactivity and Non-Covalent Interactions</h2>
  <p>
    We carry out collaborative projects examining reaction pathways and non-covalent
    interactions using wave function theory methods in both gas phase and condensed
    phases. A particular interest lies in London dispersion forces, which play a
    critical role in the stabilization of chemical systems ranging from small molecular
    clusters to large supramolecular assemblies.
  </p>
  <p>
    This work includes accurate computational benchmarking of non-covalent interaction
    energies, studies of chirality recognition driven by dispersion forces, and
    mechanistic investigations of transition metal catalyzed reactions. We collaborate
    closely with experimental groups, particularly in the context of the
    <a href="https://www.uni-goettingen.de/de/bench/560231.html" target="_blank" rel="noopener">BENCh RTG2455</a>
    research training group and the qmbench initiative.
  </p>
  <div class="key-publications">
    <strong>Key publications:</strong>
    <ul>
      <li>Mata &amp; Suhm, <em>Angew. Chem. Int. Ed.</em> 56, 11011–11018 (2017) —
        <a href="https://doi.org/10.1002/anie.201611308" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Aniban et al., <em>Phys. Chem. Chem. Phys.</em> 23, 12093–12104 (2021) —
        <a href="https://doi.org/10.1039/d1cp01225h" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Mata et al., <em>Acc. Chem. Res.</em> 57, 1077–1086 (2024) —
        <a href="https://doi.org/10.1021/acs.accounts.3c00664" target="_blank" rel="noopener">DOI</a>
      </li>
    </ul>
  </div>
</section>

<section class="research-section">
  <h2>Local Correlation Methods</h2>
  <p>
    High-level correlated wave function methods such as CCSD(T) provide exceptional
    accuracy but are computationally expensive, scaling steeply with system size.
    We develop and apply local correlation approaches that exploit the short-range
    nature of electron correlation to achieve near-linear scaling while retaining
    the accuracy of canonical methods.
  </p>
  <p>
    Our work spans the development of correlation regions within localized molecular
    orbital frameworks, integration with QM/MM and many-body expansion schemes,
    and multicomponent methods that treat nuclear quantum effects. These developments
    extend the range of systems tractable with high-level wavefunction theory to
    enzymatic active sites, molecular crystals, and condensed-phase environments.
  </p>
  <div class="key-publications">
    <strong>Key publications:</strong>
    <ul>
      <li>Mata, Werner &amp; Schütz, <em>J. Chem. Phys.</em> 128, 144106 (2008) —
        <a href="https://doi.org/10.1063/1.2905220" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Feldt &amp; Mata, <em>J. Chem. Theory Comput.</em> 14, 5192–5202 (2018) —
        <a href="https://doi.org/10.1021/acs.jctc.8b00727" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Teuteberg, Eckhoff &amp; Mata, <em>J. Chem. Phys.</em> 150, 154118 (2019) —
        <a href="https://doi.org/10.1063/1.5080427" target="_blank" rel="noopener">DOI</a>
      </li>
      <li>Hasecke &amp; Mata, <em>J. Chem. Theory Comput.</em> 19, 8223–8233 (2023) —
        <a href="https://doi.org/10.1021/acs.jctc.3c01055" target="_blank" rel="noopener">DOI</a>
      </li>
    </ul>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add research.html
git commit -m "feat: add research page with three sections"
```

---

### Task 5: members.html — Group members

**Files:**
- Create: `members.html`

**Step 1: Create members.html**

Use the shared template. Body content below. Each `.member-card` contains name, role, and contact details sourced from the university members page.

```html
<div class="page-header">
  <h1>Group Members</h1>
  <p>Institut für Physikalische Chemie, Georg-August-Universität Göttingen</p>
</div>

<!-- Group Leader -->
<div class="members-group">
  <h2>Group Leader</h2>
  <div class="member-grid">
    <div class="member-card leader">
      <h3>Prof. Dr. Ricardo Mata</h3>
      <div class="role">Group Leader</div>
      <div class="details">
        Office: Room 4.125<br>
        Phone: +49-(551) 39-23149<br>
        Email: <a href="mailto:rmata@gwdg.de">rmata@gwdg.de</a>
      </div>
    </div>
  </div>
</div>

<!-- Secretary -->
<div class="members-group">
  <h2>Secretary</h2>
  <div class="member-grid">
    <div class="member-card">
      <h3>Martina Plaettner</h3>
      <div class="role">Secretary</div>
      <div class="details">
        Office: Room 4.126<br>
        Phone: +49-(551) 39-23132<br>
        Email: <a href="mailto:martina.plaettner@chemie.uni-goettingen.de">martina.plaettner@chemie.uni-goettingen.de</a>
      </div>
    </div>
  </div>
</div>

<!-- Post-Doctoral Researchers -->
<div class="members-group">
  <h2>Post-Doctoral Researchers</h2>
  <div class="member-grid">
    <div class="member-card">
      <h3>Dr. Benjamin Schröder</h3>
      <div class="role">Research Scientist — Theoretical Molecular Spectroscopy</div>
      <div class="details">
        Office: Room 4
      </div>
    </div>
    <div class="member-card">
      <h3>Dr. Martí Gimferrer</h3>
      <div class="role">Post-Doctoral Researcher — Nuclear Quantum Effects &amp; Chemical Bonding</div>
      <div class="details">
        Office: Room 4.120<br>
        Email: <a href="mailto:marti.gimferrerandres@uni-goettingen.de">marti.gimferrerandres@uni-goettingen.de</a>
      </div>
    </div>
  </div>
</div>

<!-- Doctoral Candidates -->
<div class="members-group">
  <h2>Doctoral Candidates</h2>
  <div class="member-grid">
    <div class="member-card">
      <h3>Maximilian Breitenbach</h3>
      <div class="role">PhD Student (SFB 1633)</div>
      <div class="details">
        Office: Room 4.115<br>
        Phone: +49-(551) 39-23257<br>
        Email: <a href="mailto:maximilian.breitenbach@uni-goettingen.de">maximilian.breitenbach@uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Lukas Hasecke</h3>
      <div class="role">PhD Student (BENCh Program)</div>
      <div class="details">
        Office: Room 4.117<br>
        Email: <a href="mailto:lukas.hasecke@stud.uni-goettingen.de">lukas.hasecke@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Wieland Mäde</h3>
      <div class="role">PhD Student</div>
      <div class="details">
        Office: Room 4.121<br>
        Email: <a href="mailto:w.maede@stud.uni-goettingen.de">w.maede@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Lynn Meeder</h3>
      <div class="role">PhD Student (SFB 1633)</div>
      <div class="details">
        Office: Room 4.115<br>
        Phone: +49-(551) 39-23257<br>
        Email: <a href="mailto:lynn.meeder@stud.uni-goettingen.de">lynn.meeder@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Maike Mücke</h3>
      <div class="role">PhD Student (BENCh Program)</div>
      <div class="details">
        Office: Room 4.117<br>
        Email: <a href="mailto:maike.muecke@stud.uni-goettingen.de">maike.muecke@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Laura Schiebel</h3>
      <div class="role">PhD Student (BENCh Program)</div>
      <div class="details">
        Office: Room 4.115<br>
        Phone: +49-(551) 39-23257<br>
        Email: <a href="mailto:l.schiebel@stud.uni-goettingen.de">l.schiebel@stud.uni-goettingen.de</a>
      </div>
    </div>
  </div>
</div>

<!-- Master's and Bachelor's Students -->
<div class="members-group">
  <h2>Master's &amp; Bachelor's Students</h2>
  <div class="member-grid">
    <div class="member-card">
      <h3>Rasmus Gehle</h3>
      <div class="role">Master's Student</div>
      <div class="details">
        Email: <a href="mailto:r.gehle@stud.uni-goettingen.de">r.gehle@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Steffen Henninger</h3>
      <div class="role">Master's Student</div>
      <div class="details">
        Email: <a href="mailto:s.henninger@stud.uni-goettingen.de">s.henninger@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Samuel Wolf</h3>
      <div class="role">Bachelor's Student</div>
      <div class="details">
        Email: <a href="mailto:samuelrobert.wolf@stud.uni-goettingen.de">samuelrobert.wolf@stud.uni-goettingen.de</a>
      </div>
    </div>
    <div class="member-card">
      <h3>Elisabeth Wagner</h3>
      <div class="role">Bachelor's Student</div>
      <div class="details">
        Email: <a href="mailto:e.wagner@stud.uni-goettingen.de">e.wagner@stud.uni-goettingen.de</a>
      </div>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add members.html
git commit -m "feat: add members page with all group members"
```

---

### Task 6: publications.html — Full publication list

**Files:**
- Create: `publications.html`

**Step 1: Create publications.html**

Use the shared template. Body content is the complete publication list 2024→2004.
Each entry uses: `<li><span class="pub-authors">AUTHORS</span>, "<span class="pub-title">TITLE</span>," <em>JOURNAL</em> VOLUME (YEAR) PAGES. <a class="pub-doi" href="https://doi.org/DOI" target="_blank" rel="noopener">[DOI]</a></li>`

```html
<div class="page-header">
  <h1>Publications</h1>
  <p>Complete publication list — see also
    <a href="https://scholar.google.com/citations?user=SCHOLAR_ID" target="_blank" rel="noopener">Google Scholar</a>
  </p>
</div>

<section class="pub-year">
  <h2>2024</h2>
  <ul class="pub-list">
    <li>Rahrt, R., Hein-Janke, B., Amarasinghe, K.N., et al., "<span class="pub-title">The Fe-MAN Challenge: Ferrates–Microkinetic Assessment of Numerical Quantum Chemistry</span>," <em>J. Phys. Chem. A</em> (2024). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpca.4c01361" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Heilmann, T., Lopez-Soria, J.M., Ulbrich, J., et al., "<span class="pub-title">N-(Sulfonio)Sulfilimine Reagents: Non-Oxidizing Sources of Electrophilic Nitrogen Atom for Skeletal Editing</span>," <em>Angew. Chem. Int. Ed.</em> (2024). <a class="pub-doi" href="https://doi.org/10.1002/anie.202403826" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Hasecke, L., Mata, R.A., "<span class="pub-title">Optimization of Quantum Nuclei Positions with the Adaptive Nuclear-Electronic Orbital Approach</span>," <em>J. Phys. Chem. A</em> 128, 3205–3211 (2024). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpca.4c00096" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Mata, R.A., Zhanabekova, T., Obenchain, D.A., Suhm, M.A., "<span class="pub-title">Dispersion Control over Molecule Cohesion: Exploiting and Dissecting the Tipping Power of Aromatic Rings</span>," <em>Acc. Chem. Res.</em> 57, 1077–1086 (2024). <a class="pub-doi" href="https://doi.org/10.1021/acs.accounts.3c00664" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Funk, L.-M., Poschmann, G., Rabe von Pappenheim, F., et al., "<span class="pub-title">Multiple redox switches of the SARS-CoV-2 main protease in vitro provide opportunities for drug design</span>," <em>Nat. Commun.</em> 15 (2024). <a class="pub-doi" href="https://doi.org/10.1038/s41467-023-44621-0" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schröder, B., Rauhut, G., "<span class="pub-title">From the Automated Calculation of Potential Energy Surfaces to Accurate Infrared Spectra</span>," <em>J. Phys. Chem. Lett.</em> 15, 3159–3169 (2024). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpclett.4c00186" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2023</h2>
  <ul class="pub-list">
    <li>Hasecke, L., Mata, R.A., "<span class="pub-title">Nuclear Quantum Effects Made Accessible: Local Density Fitting in Multicomponent Methods</span>," <em>J. Chem. Theory Comput.</em> 19, 8223–8233 (2023). <a class="pub-doi" href="https://doi.org/10.1021/acs.jctc.3c01055" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Sergeieva, T., Demirer, T.I., Wuttke, A., et al., "<span class="pub-title">Revisiting the origin of the bending in group 2 metallocenes AeCp2 (Ae = Be–Ba)</span>," <em>Phys. Chem. Chem. Phys.</em> 25, 20657–20667 (2023). <a class="pub-doi" href="https://doi.org/10.1039/D2CP05020J" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schröder, B., "<span class="pub-title">Ab Initio Rovibrational Spectroscopy of the Acetylide Anion</span>," <em>Molecules</em> 28, 5700 (2023). <a class="pub-doi" href="https://doi.org/10.3390/molecules28155700" target="_blank" rel="noopener">[DOI]</a></li>
    <li>De Vos, J., Rauhut, G., Schröder, B., "<span class="pub-title">Comprehensive quantum chemical analysis of the (ro)vibrational spectrum of thiirane and its deuterated isotopologue</span>," <em>Spectrochim. Acta A</em> 302, 123083 (2023). <a class="pub-doi" href="https://doi.org/10.1016/j.saa.2023.123083" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Mata, R.A., Zehnacker-Rentien, A., Suhm, M.A., "<span class="pub-title">Benchmark experiments for numerical quantum chemistry</span>," <em>Phys. Chem. Chem. Phys.</em> 25, 26415–26416 (2023). <a class="pub-doi" href="https://doi.org/10.1039/D3CP90186F" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Uranga, J., Rabe von Pappenheim, F., Tittmann, K., Mata, R.A., "<span class="pub-title">Dynamic Protonation States Underlie Carbene Formation in ThDP-Dependent Enzymes: A Theoretical Study</span>," <em>J. Phys. Chem. B</em> (2023). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpcb.3c03137" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Fischer, T.L., Bödecker, M., Schweer, S.M., et al., "<span class="pub-title">The first HyDRA challenge for computational vibrational spectroscopy</span>," <em>Phys. Chem. Chem. Phys.</em> 25, 22089–22102 (2023). <a class="pub-doi" href="https://doi.org/10.1039/D3CP01216F" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Lāce, I., Bazzi, S., Uranga, J., et al., "<span class="pub-title">Modulating Secondary Structure Motifs Through Photo-Labile Peptide Staples</span>," <em>ChemBioChem</em> 24, e202300270 (2023). <a class="pub-doi" href="https://doi.org/10.1002/cbic.202300270" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Ye, J., Bazzi, S., Fritz, T., et al., "<span class="pub-title">Mechanisms of Cysteine-Lysine Covalent Linkage—The Role of Reactive Oxygen Species and Competition with Disulfide Bonds</span>," <em>Angew. Chem. Int. Ed.</em> 62, e202304163 (2023). <a class="pub-doi" href="https://doi.org/10.1002/anie.202304163" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Feng, Z., Riemann, L., Guo, Z., et al., "<span class="pub-title">Pentafluorocyclopropanation of (Hetero)arenes Using Sulfonium Salts: Applications in Late-Stage Functionalization</span>," <em>Angew. Chem. Int. Ed.</em> 62, e202306764 (2023). <a class="pub-doi" href="https://doi.org/10.1002/anie.202306764" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Uranga, J., Mata, R.A., "<span class="pub-title">The Catalytic Mechanism of Acetoacetate Decarboxylase: A Detailed Study of Schiff Base Formation, Protonation States, and Their Impact on Catalysis</span>," <em>J. Chem. Inf. Model.</em> 63, 3118–3127 (2023). <a class="pub-doi" href="https://doi.org/10.1021/acs.jcim.3c00241" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Feng, Z., Marset, X., Tostado, J., et al., "<span class="pub-title">5-(Trifluorovinyl)dibenzothiophenium Triflate: Introducing the 1,1,2-Trifluoroethylene Tether in Drug-Like Structures</span>," <em>Chem. Eur. J.</em> 29, e202203966 (2023). <a class="pub-doi" href="https://doi.org/10.1002/chem.202203966" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Bloch, W.M., Horiuchi, S., Holstein, J.J., et al., "<span class="pub-title">Maximized axial helicity in a Pd2L4 cage: inverse guest size-dependent compression and mesocate isomerism</span>," <em>Chem. Sci.</em> 14, 1524–1531 (2023). <a class="pub-doi" href="https://doi.org/10.1039/D2SC06629G" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Weser, O., Hein-Janke, B., Mata, R.A., "<span class="pub-title">Automated handling of complex chemical structures in Z-matrix coordinates — the chemcoord library</span>," <em>J. Comput. Chem.</em> 44, 710–726 (2023). <a class="pub-doi" href="https://doi.org/10.1002/jcc.27029" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2022</h2>
  <ul class="pub-list">
    <li>Dinu, D.F., Tschöpe, M., Schröder, B., Liedl, K.R., Rauhut, G., "<span class="pub-title">Determination of spectroscopic constants from rovibrational configuration interaction calculations</span>," <em>J. Chem. Phys.</em> 157, 154107 (2022). <a class="pub-doi" href="https://doi.org/10.1063/5.0116018" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Karnbrock, S.B.H., Golz, C., Mata, R.A., Alcarazo, M., "<span class="pub-title">Ligand-Enabled Disproportionation of 1,2-Diphenylhydrazine at a P-V-Center</span>," <em>Angew. Chem. Int. Ed.</em> 61, e202207450 (2022). <a class="pub-doi" href="https://doi.org/10.1002/anie.202207450" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Zeng, K., Ye, J., Meng, X., et al., "<span class="pub-title">Anomeric Stereoauxiliary Cleavage of the C-N Bond of d-Glucosamine for the Preparation of Imidazo[1,5-a]pyridines</span>," <em>Chem. Eur. J.</em> 28, e202200648 (2022). <a class="pub-doi" href="https://doi.org/10.1002/chem.202200648" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Fischer, T.L., Bödecker, M., Zehnacker-Rentien, A., Mata, R.A., Suhm, M.A., "<span class="pub-title">Setting up the HyDRA blind challenge for the microhydration of organic molecules</span>," <em>Phys. Chem. Chem. Phys.</em> 24, 11442–11454 (2022). <a class="pub-doi" href="https://doi.org/10.1039/D2CP01119K" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schürmann, C.J., Teuteberg, T.L., Stückl, A.C., et al., "<span class="pub-title">Trapping X-ray Radiation Damage from Homolytic Se−C Bond Cleavage in BnSeSeBn Crystals</span>," <em>Angew. Chem. Int. Ed.</em> 61, e202206537 (2022). <a class="pub-doi" href="https://doi.org/10.1002/anie.202203665" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Rindfleisch, S., Krull, M., Uranga, J., et al., "<span class="pub-title">Ground-state destabilization by electrostatic repulsion is not a driving force in orotidine-5′-monophosphate decarboxylase catalysis</span>," <em>Nature Catalysis</em> 5, 332–341 (2022). <a class="pub-doi" href="https://doi.org/10.1038/s41929-022-00771-w" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schröder, B., Sebald, P., "<span class="pub-title">Variational rovibrational calculations for tetra atomic linear molecules using Watson's isomorphic Hamiltonian: II. The B11244 story retold</span>," <em>J. Mol. Spectrosc.</em> 386, 111628 (2022). <a class="pub-doi" href="https://doi.org/10.1016/j.jms.2022.111628" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Proppe, J., Kircher, J., "<span class="pub-title">Uncertainty Quantification of Reactivity Scales</span>," <em>ChemPhysChem</em> 23, e202200061 (2022). <a class="pub-doi" href="https://doi.org/10.1002/cphc.202200195" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schröder, B., "<span class="pub-title">Variational rovibrational calculations for tetra atomic linear molecules using Watson's isomorphic Hamiltonian, I: The C8v4 approach</span>," <em>J. Mol. Spectrosc.</em> 385, 111613 (2022). <a class="pub-doi" href="https://doi.org/10.1016/j.jms.2022.111613" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Rabe von Pappenheim, F., Wensien, M., Ye, J., et al., "<span class="pub-title">Widespread occurrence of covalent lysine–cysteine redox switches in proteins</span>," <em>Nat. Chem. Biol.</em> 18, 368–375 (2022). <a class="pub-doi" href="https://doi.org/10.1038/s41589-021-00966-5" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2021</h2>
  <ul class="pub-list">
    <li>Suarez-Pantiga, S., Redero, P., Aniban, X., et al., "<span class="pub-title">In-Fjord Substitution in Expanded Helicenes: Effects of the Insert on the Inversion Barrier and Helical Pitch</span>," <em>Chem. Eur. J.</em> 27, 13358–13366 (2021). <a class="pub-doi" href="https://doi.org/10.1002/chem.202102585" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Doerr, M., Hielscher, M.M., Proppe, J., Waldvogel, S.R., "<span class="pub-title">Electrosynthetic Screening and Modern Optimization Strategies for Electrosynthesis of Highly Value-added Products</span>," <em>ChemElectroChem</em> 8, 2621–2629 (2021). <a class="pub-doi" href="https://doi.org/10.1002/celc.202100318" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Friederich, P., Hase, F., Proppe, J., Aspuru-Guzik, A., "<span class="pub-title">Machine-learned potentials for next-generation matter simulations</span>," <em>Nature Materials</em> 20, 750–761 (2021). <a class="pub-doi" href="https://doi.org/10.1038/s41563-020-0777-6" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Aniban, X., Hartwig, B., Wuttke, A., Mata, R.A., "<span class="pub-title">Dispersion forces in chirality recognition — a density functional and wave function theory study of diols</span>," <em>Phys. Chem. Chem. Phys.</em> 23, 12093–12104 (2021). <a class="pub-doi" href="https://doi.org/10.1039/d1cp01225h" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Wensien, M., Rabe von Pappenheim, F., Funk, L.-M., et al., "<span class="pub-title">A lysine-cysteine redox switch with an NOS bridge regulates enzyme function</span>," <em>Nature</em> 593, 460–464 (2021). <a class="pub-doi" href="https://doi.org/10.1038/s41586-021-03513-3" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Uranga, J., Hasecke, L., Proppe, J., Fingerhut, J., Mata, R.A., "<span class="pub-title">Theoretical Studies of the Acid-Base Equilibria in a Model Active Site of the Human 20S Proteasome</span>," <em>J. Chem. Inf. Model.</em> 61, 1942–1953 (2021). <a class="pub-doi" href="https://doi.org/10.1021/acs.jcim.0c01459" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Gallenkamp, C., Kramm, U., Proppe, J., Krewald, V., "<span class="pub-title">Calibration of computational Mössbauer spectroscopy to unravel active sites in FeNC catalysts for the oxygen reduction reaction</span>," <em>Int. J. Quantum Chem.</em> 121 (2021). <a class="pub-doi" href="https://doi.org/10.1002/qua.26394" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Zimara, J., Stevens, H., Oswald, R., et al., "<span class="pub-title">Time-Resolved Spectroscopy of Photoinduced Electron Transfer in Dinuclear and Tetranuclear Fe/Co Prussian Blue Analogues</span>," <em>Inorg. Chem.</em> 60, 449–459 (2021). <a class="pub-doi" href="https://doi.org/10.1021/acs.inorgchem.0c03249" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Duan, P.-C., Schulz, R.A., Römer, A., et al., "<span class="pub-title">Ligand Protonation Triggers H2 Release from a Dinickel Dihydride Complex to Give a Doubly "T"-Shaped Dinickel(I) Metallodiradical</span>," <em>Angew. Chem. Int. Ed.</em> 133, 1919–1924 (2021). <a class="pub-doi" href="https://doi.org/10.1002/ange.202011494" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2020</h2>
  <ul class="pub-list">
    <li>Römer, A., Hasecke, L., Blöchl, P., Mata, R.A., "<span class="pub-title">A Review of Density Functional Models for the Description of Fe(II) Spin-Crossover Complexes</span>," <em>Molecules</em> 25, 5176 (2020). <a class="pub-doi" href="https://doi.org/10.3390/molecules25215176" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Paul, L.A., Röttcher, N.C., Zimara, J., et al., "<span class="pub-title">Photochemical Properties of Re(CO)3 Complexes with and without a Local Proton Source and Implications for CO2 Reduction Catalysis</span>," <em>Organometallics</em> 39, 2405–2415 (2020). <a class="pub-doi" href="https://doi.org/10.1021/acs.organomet.0c00240" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Zhao, M., Barrado, A.G., Sprenger, K., et al., "<span class="pub-title">Electrophilic Cyanative Alkenylation of Arenes</span>," <em>Org. Lett.</em> 22, 4932–4937 (2020). <a class="pub-doi" href="https://doi.org/10.1021/acs.orglett.0c01204" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Bahlke, M.P., Mogos, N., Proppe, J., Herrmann, C., "<span class="pub-title">Exchange Spin Coupling from Gaussian Process Regression</span>," <em>J. Phys. Chem. A</em> 124, 8708–8723 (2020). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpca.0c05983" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Werner, M., Oliveira, J.C.A., Meiser, W., Buback, M., Mata, R.A., "<span class="pub-title">Critical Assessment of RAFT Equilibrium Constants: Theory Meets Experiment</span>," <em>Macromol. Theory Simul.</em> 29, 2000022 (2020). <a class="pub-doi" href="https://doi.org/10.1002/mats.202000022" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Gottschalk, H.C., Poblotzki, A., Fatima, M., et al., "<span class="pub-title">The first microsolvation step for furans: New experiments and benchmarking strategies</span>," <em>J. Chem. Phys.</em> 152, 164303 (2020). <a class="pub-doi" href="https://doi.org/10.1063/5.0004465" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2019</h2>
  <ul class="pub-list">
    <li>Dai, S., Funk, L.-M., Rabe von Pappenheim, F., et al., "<span class="pub-title">Low-barrier hydrogen bonds in enzyme cooperativity</span>," <em>Nature</em> 573, 609–613 (2019). <a class="pub-doi" href="https://doi.org/10.1038/s41586-019-1581-9" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Paulikat, M., Mata, R.A., Gelabert, R., "<span class="pub-title">A high-throughput computational approach to UV-Vis spectra in protein mutants</span>," <em>Phys. Chem. Chem. Phys.</em> 21, 20678–20692 (2019). <a class="pub-doi" href="https://doi.org/10.1039/C9CP03908B" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Teuteberg, T., Eckhoff, M., Mata, R.A., "<span class="pub-title">A full additive QM/MM scheme for the computation of molecular crystals with extension to many-body expansions</span>," <em>J. Chem. Phys.</em> 150, 154118 (2019). <a class="pub-doi" href="https://doi.org/10.1063/1.5080427" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Forsting, T., Zischang, J., Suhm, M.A., et al., "<span class="pub-title">Strained hydrogen bonding in imidazole trimer: a combined infrared, Raman, and theory study</span>," <em>Phys. Chem. Chem. Phys.</em> 21, 5989–5998 (2019). <a class="pub-doi" href="https://doi.org/10.1039/C9CP00399A" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Feldt, M., Phung, Q.M., Pierloot, K., Mata, R.A., Harvey, J.N., "<span class="pub-title">Limits of Coupled-Cluster Calculations for Non-Heme Iron Complexes</span>," <em>J. Chem. Theory Comput.</em> 15, 922–937 (2019). <a class="pub-doi" href="https://doi.org/10.1021/acs.jctc.8b00963" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2018</h2>
  <ul class="pub-list">
    <li>Feldt, M., Mata, R.A., "<span class="pub-title">Hybrid Local Molecular Orbital: Molecular Orbital Calculations for Open Shell Systems</span>," <em>J. Chem. Theory Comput.</em> 14, 5192–5202 (2018). <a class="pub-doi" href="https://doi.org/10.1021/acs.jctc.8b00727" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Schürmann, C.J., Herbst-Irmer, R., Teuteberg, T.L., et al., "<span class="pub-title">Experimental charge density study on FLPs and a FLP reaction product</span>," <em>Z. Kristallogr.</em> 233, 723–731 (2018). <a class="pub-doi" href="https://doi.org/10.1515/zkri-2018-2061" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Wuttke, A., Feldt, M., Mata, R.A., "<span class="pub-title">All That Binds Is Not Gold — The Relative Weight of Aurophilic Interactions in Complex Formation</span>," <em>J. Phys. Chem. A</em> 122, 6918–6925 (2018). <a class="pub-doi" href="https://doi.org/10.1021/acs.jpca.8b06546" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Bernhard, D., Dietrich, F., Fatima, M., et al., "<span class="pub-title">The phenyl vinyl ether–methanol complex: a model system for quantum chemistry benchmarking</span>," <em>Beilstein J. Org. Chem.</em> 14, 1642–1654 (2018). <a class="pub-doi" href="https://doi.org/10.3762/bjoc.14.140" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Caldararu, O., Feldt, M., Cioloboc, D., et al., "<span class="pub-title">QM/MM study of the reaction mechanism of sulfite oxidase</span>," <em>Sci. Rep.</em> 8, 4684 (2018). <a class="pub-doi" href="https://doi.org/10.1038/s41598-018-22751-6" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Gottschalk, H.C., Poblotzki, A., Suhm, M.A., et al., "<span class="pub-title">The furan microsolvation blind challenge for quantum chemical methods: First steps</span>," <em>J. Chem. Phys.</em> 148, 014301 (2018). <a class="pub-doi" href="https://doi.org/10.1063/1.5009011" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2017</h2>
  <ul class="pub-list">
    <li>Feldt, J., Miranda, S., Pratas, F., Roma, N., Tomas, P., Mata, R.A., "<span class="pub-title">Optimization and benchmarking of a perturbative Metropolis Monte Carlo quantum mechanics/molecular mechanics program</span>," <em>J. Chem. Phys.</em> 147, 244105 (2017). <a class="pub-doi" href="https://doi.org/10.1063/1.5009820" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Manz, D.-H., Duan, P.-C., Dechert, S., et al., "<span class="pub-title">Pairwise H2/D2 Exchange and H2 Substitution at a Bimetallic Dinickel(II) Complex Featuring Two Terminal Hydrides</span>," <em>J. Am. Chem. Soc.</em> 139, 16720–16731 (2017). <a class="pub-doi" href="https://doi.org/10.1021/jacs.7b08629" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Loeffler, S., Wuttke, A., Zhang, B., Holstein, J.J., Mata, R.A., Clever, G.H., "<span class="pub-title">Influence of size, shape, heteroatom content and dispersive contributions on guest binding in a coordination cage</span>," <em>Chem. Commun.</em> 53, 11933–11936 (2017). <a class="pub-doi" href="https://doi.org/10.1039/C7CC04855F" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Miranda, S., Feldt, J., Pratas, F., et al., "<span class="pub-title">Efficient parallelization of perturbative Monte Carlo QM/MM simulations in heterogeneous platforms</span>," <em>Int. J. High Perform. Comput. Appl.</em> 31, 499–516 (2017). <a class="pub-doi" href="https://doi.org/10.1177/1094342016649420" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Krick, M., Holstein, J.J., Wuttke, A., Mata, R.A., Clever, G.H., "<span class="pub-title">Temperature-Dependent Dynamics of Push-Pull Rotor Systems Based on Acridinylidene Cyanoacetic Esters</span>," <em>Eur. J. Org. Chem.</em> 34, 5141–5146 (2017). <a class="pub-doi" href="https://doi.org/10.1002/ejoc.201700873" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Mata, R.A., Suhm, M.A., "<span class="pub-title">Benchmarking Quantum Chemical Methods: Are We Heading in the Right Direction?</span>," <em>Angew. Chem. Int. Ed.</em> 56, 11011–11018 (2017). <a class="pub-doi" href="https://doi.org/10.1002/anie.201611308" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Newie, J., Neumann, P., Werner, M., Mata, R.A., Ficner, R., Feussner, I., "<span class="pub-title">Lipoxygenase 2 from Cyanothece sp controls dioxygen insertion by steric shielding and substrate fixation</span>," <em>Sci. Rep.</em> 7, 2069 (2017). <a class="pub-doi" href="https://doi.org/10.1038/s41598-017-02153-w" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Meyer, T.H., Liu, W., Feldt, M., Wuttke, A., Mata, R.A., Ackermann, L., "<span class="pub-title">Manganese(I)-Catalyzed Dispersion-Enabled C-H/C-C Activation</span>," <em>Chem. Eur. J.</em> 23, 5443–5447 (2017). <a class="pub-doi" href="https://doi.org/10.1002/chem.201701191" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Vogt-Geisse, S., Mata, R.A., Toro-Labbe, A., "<span class="pub-title">High level potential energy surface and mechanism of Al(CH3)2OCH3-promoted lactone polymerization: initiation and propagation</span>," <em>Phys. Chem. Chem. Phys.</em> 19, 8989–8999 (2017). <a class="pub-doi" href="https://doi.org/10.1039/C7CP00809K" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Paulikat, M., Wechsler, C., Tittmann, K., Mata, R.A., "<span class="pub-title">Theoretical Studies of the Electronic Absorption Spectra of Thiamin Diphosphate in Pyruvate Decarboxylase</span>," <em>Biochemistry</em> 56, 1854–1864 (2017). <a class="pub-doi" href="https://doi.org/10.1021/acs.biochem.6b00984" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Wuttke, A., Mata, R.A., "<span class="pub-title">Visualizing dispersion interactions through the use of local orbital spaces</span>," <em>J. Comput. Chem.</em> 38, 15–23 (2017). <a class="pub-doi" href="https://doi.org/10.1002/jcc.24508" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Wilting, A., Stolper, T., Mata, R.A., Siewert, I., "<span class="pub-title">Dinuclear Rhenium Complex with a Proton Responsive Ligand as a Redox Catalyst for the Electrochemical CO2 Reduction</span>," <em>Inorg. Chem.</em> 56, 4176–4185 (2017). <a class="pub-doi" href="https://doi.org/10.1021/acs.inorgchem.7b00178" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2016</h2>
  <ul class="pub-list">
    <li>Schrader, J., Henneberg, F., Mata, R.A., et al., "<span class="pub-title">The inhibition mechanism of human 20S proteasomes enables next-generation inhibitor design</span>," <em>Science</em> 353, 594–598 (2016). <a class="pub-doi" href="https://doi.org/10.1126/science.aaf8993" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Löffler, S., Lübben, J., Wuttke, A., Mata, R.A., John, M., Dittrich, B., Clever, G.H., "<span class="pub-title">Internal Dynamics and Guest Binding of a Sterically Overcrowded Host</span>," <em>Chem. Sci.</em> 7, 4676–4684 (2016). <a class="pub-doi" href="https://doi.org/10.1039/C6SC00985A" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Neufeld, R., Teuteberg, T.L., Herbst-Irmer, R., Mata, R.A., Stalke, D., "<span class="pub-title">Solution Structures of Hauser Base iPr2NMgCl and Turbo-Hauser Base iPr2NMgCl·LiCl in THF and the Influence of LiCl on the Schlenk-Equilibrium</span>," <em>J. Am. Chem. Soc.</em> 138, 4796–4806 (2016). <a class="pub-doi" href="https://doi.org/10.1021/jacs.6b00345" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Visscher, A., Bachmann, S., Schnegelsberg, C., Teuteberg, T., Mata, R.A., Stalke, D., "<span class="pub-title">Highly Selective and Sensitive Fluorescence Detection of Zn2+ and Cd2+ Ions by an Acridine Sensor</span>," <em>Dalton Trans.</em> 45, 5689–5699 (2016). <a class="pub-doi" href="https://doi.org/10.1039/C6DT00557H" target="_blank" rel="noopener">[DOI]</a></li>
  </ul>
</section>

<section class="pub-year">
  <h2>2015</h2>
  <ul class="pub-list">
    <li>Li, J., Andrejic, M., Mata, R.A., Ryde, U., "<span class="pub-title">A Computational Comparison of Oxygen Atom Transfer Catalyzed by Dimethyl Sulfoxide Reductase with Mo and W</span>," <em>Eur. J. Inorg. Chem.</em> 21, 3580–3589 (2015).</li>
    <li>Heger, M., Mata, R.A., Suhm, M., "<span class="pub-title">Soft hydrogen bonds to alkenes: the methanol-ethene prototype under experimental and theoretical scrutiny</span>," <em>Chem. Sci.</em> 6, 3738–3745 (2015).</li>
    <li>Heger, M., Otto, K.E., Mata, R.A., Suhm, M., "<span class="pub-title">Bracketing subtle conformational energy differences between self-solvated and stretched trifluoropropanol</span>," <em>Phys. Chem. Chem. Phys.</em> 17, 9899–9909 (2015).</li>
    <li>Zischang, J., Skvortsov, D., Choi, M.Y., Mata, R.A., Suhm, M., Vilesov, A.F., "<span class="pub-title">Helium Nanodroplet Study of the Hydrogen-Bonded OH Vibrations in HCl-H2O Clusters</span>," <em>J. Phys. Chem. A</em> 119, 2636–2643 (2015).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2014</h2>
  <ul class="pub-list">
    <li>Andrejic, M., Mata, R.A., "<span class="pub-title">Local Hybrid QM/QM Calculations of Reaction Pathways in Metallobiosites</span>," <em>J. Chem. Theory Comput.</em> 10, 5397–5404 (2014).</li>
    <li>Kalz, K.F., Brinkmeier, A., Dechert, S., Mata, R.A., Meyer, F., "<span class="pub-title">Functional Model for the [Fe] Hydrogenase Inspired by the Frustrated Lewis Pair Concept</span>," <em>J. Am. Chem. Soc.</em> 136, 16626–16634 (2014).</li>
    <li>Pöppler, A.-C., Granitzka, M., Herbst-Irmer, R., et al., "<span class="pub-title">Characterization of a multicomponent lithium lithiate from a combined x-ray diffraction, NMR spectroscopy, and computational approach</span>," <em>Angew. Chem. Int. Ed.</em> 53, 13282–13287 (2014).</li>
    <li>Andrejic, M., Ryde, U., Mata, R.A., Söderhjelm, P., "<span class="pub-title">Coupled-cluster interaction energies for 200-atom host-guest systems</span>," <em>ChemPhysChem</em> 15, 3270–3281 (2014).</li>
    <li>van Severen, M.-C., Andrejic, M., Li, J.L., Starke, K., Mata, R.A., Nordlander, E., Ryde, U., "<span class="pub-title">A quantum-mechanical study of the reaction mechanism of sulfite oxidase</span>," <em>J. Biol. Inorg. Chem.</em> 19, 1165–1179 (2014).</li>
    <li>Heger, M., Suhm, M.A., Mata, R.A., "<span class="pub-title">Towards the binding energy and vibrational red shift of the simplest organic hydrogen bond: Harmonic constraints for methanol dimer</span>," <em>J. Chem. Phys.</em> 141, 101105 (2014).</li>
    <li>Mikulskis, P., Cioloboc, D., Andrejic, M., et al., "<span class="pub-title">Free-energy perturbation and quantum mechanical study of SAMPL4 octa-acid host-guest binding energies</span>," <em>J. Comput. Aided Mol. Des.</em> 28, 375–400 (2014).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2013</h2>
  <ul class="pub-list">
    <li>Frank, M., Dieterich, J.M., Freye, S., Mata, R.A., Clever, G.H., "<span class="pub-title">Relative anion binding affinity in a series of interpenetrated coordination cages</span>," <em>Dalton Trans.</em> 42, 15906–15910 (2013).</li>
    <li>Hey, J., Andrada, D.M., Michel, R., Mata, R.A., Stalke, D., "<span class="pub-title">Strong Intermolecular Interactions Shaping a Small Piano-Stool Complex</span>," <em>Angew. Chem. Int. Ed.</em> 52, 10365–10369 (2013).</li>
    <li>Bretschneider, A., Andrada, D.M., Dechert, S., Meyer, S., Mata, R.A., Meyer, F., "<span class="pub-title">Preorganized anion traps for exploiting anion-π interactions — an experimental and computational study</span>," <em>Chem. Eur. J.</em> 19, 16988–17000 (2013).</li>
    <li>Hey, J., Leusser, D., Kratzert, D., Fliegl, H., Dieterich, J.M., Mata, R.A., Stalke, D., "<span class="pub-title">Heteroaromaticity approached by charge density investigations and wave function calculations</span>," <em>Phys. Chem. Chem. Phys.</em> 15, 20600–20610 (2013).</li>
    <li>Andrejic, M., Mata, R.A., "<span class="pub-title">Study of ligand effects in aurophilic interactions using local correlation methods</span>," <em>Phys. Chem. Chem. Phys.</em> 15, 18115–18122 (2013).</li>
    <li>Maass, C., Andrada, D.M., Mata, R.A., Herbst-Irmer, R., Stalke, D., "<span class="pub-title">Effects of Metal Coordination on the π-System of the 2,5-Bis-{(pyrrolidino)-methyl}-pyrrole Pincer Ligand</span>," <em>Inorg. Chem.</em> 52, 9539–9548 (2013).</li>
    <li>Li, J.-L., Mata, R.A., Ryde, U., "<span class="pub-title">Large Density-Functional and Basis-Set Effects for the DMSO Reductase Catalyzed Oxo-Transfer Reaction</span>," <em>J. Chem. Theory Comput.</em> 9, 1799–1807 (2013).</li>
    <li>Azhakar, R., Ghadwal, R.S., Roesky, H.W., Mata, R.A., Wolf, H., Herbst-Irmer, R., Stalke, D., "<span class="pub-title">Reaction of N-Heterocyclic Silylenes with Thioketone: Formation of Silicon-Sulfur Three- and Five-Membered Ring Systems</span>," <em>Chem. Eur. J.</em> 19, 3715–3720 (2013).</li>
    <li>Michel, R., Nack, T., Neufeld, R., Dieterich, J.M., Mata, R.A., Stalke, D., "<span class="pub-title">The Layered Structure of [Na(NH3)4][Indenide] Containing a Square-Planar Na(NH3)4+ Cation</span>," <em>Angew. Chem. Int. Ed.</em> 52, 734–738 (2013).</li>
    <li>Lüttschwager, N.O.B., Wassermann, T.N., Mata, R.A., Suhm, M.A., "<span class="pub-title">The Last Globally Stable Extended Alkane</span>," <em>Angew. Chem. Int. Ed.</em> 52, 463–466 (2013).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2012</h2>
  <ul class="pub-list">
    <li>Dieterich, J.M., Clever, G.H., Mata, R.A., "<span class="pub-title">A push-and-pull model for allosteric anion binding in cage complexes</span>," <em>Phys. Chem. Chem. Phys.</em> 14, 12746–12749 (2012).</li>
    <li>Dieterich, J.M., Oliveira, J.C.A., Mata, R.A., "<span class="pub-title">Application of Local Second-Order Møller-Plesset Perturbation Theory to the Study of Structures in Solution</span>," <em>J. Chem. Theory Comput.</em> 8, 3053–3060 (2012).</li>
    <li>Oliveira, J.C.A., Feldt, J., Galamba, N., Mata, R.A., "<span class="pub-title">Study of Specific Ion-Amino Acid Interactions through the Use of Local Correlation Methods</span>," <em>J. Phys. Chem. A</em> 116, 5464–5471 (2012).</li>
    <li>Forck, R.M., Dieterich, J.M., Pradzynski, C.C., Hutching, A.L., Mata, R.A., Zeuch, T., "<span class="pub-title">Structural diversity in sodium doped water trimers</span>," <em>Phys. Chem. Chem. Phys.</em> 14, 9054–9057 (2012).</li>
    <li>Pratas, F., Dieterich, J.M., Sousa, L., Mata, R.A., "<span class="pub-title">Computation of induced dipoles in molecular mechanics simulations using Graphics Processors</span>," <em>J. Chem. Inf. Model.</em> 52, 1159–1166 (2012).</li>
    <li>Feldt, J., Mata, R.A., Dieterich, J.M., "<span class="pub-title">Atomdroid: A computational chemistry tool for mobile platforms</span>," <em>J. Chem. Inf. Model.</em> 52, 1072–1078 (2012). <a class="pub-doi" href="https://doi.org/10.1021/ci3000197" target="_blank" rel="noopener">[DOI]</a></li>
    <li>Khan, S., Samuel, P.P., Michel, R., Dieterich, J.M., Mata, R.A., Demers, J.-P., Lange, A., Roesky, H.W., Stalke, D., "<span class="pub-title">Monomeric Sn(II) and Ge(II) Hydrides Supported by Tridentate Pincer-based Ligand</span>," <em>Chem. Commun.</em> 48, 4890–4892 (2012).</li>
    <li>Dieterich, J.M., Gerke, S., Mata, R.A., "<span class="pub-title">A first-principles based potential for the description of alkaline-earth metals</span>," <em>J. At. Mol. Opt. Phys.</em> 2012, ID 648386 (2012).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2011</h2>
  <ul class="pub-list">
    <li>Khan, S., Michel, R., Dieterich, J.M., Mata, R.A., Roesky, H.W., Demers, J.-P., Lange, A., Stalke, D., "<span class="pub-title">Preparation of RSn(I)-Sn(I)R with Two Unsymmetrically Coordinated Sn(I) Atoms and Subsequent Gentle Activation of P4</span>," <em>J. Am. Chem. Soc.</em> 133, 17889–17994 (2011).</li>
    <li>Sen, S.S., Hey, J., Herbst-Irmer, R., Eckhardt, M., Mata, R.A., Roesky, H.W., Scheer, M., Stalke, D., "<span class="pub-title">Stable Cation of a CSi3P Five-Membered Ring with a Weakly Coordinate Chloride Anion</span>," <em>Angew. Chem. Int. Ed.</em> 50, 12510–12513 (2011).</li>
    <li>Pandey, S.K., Jogdand, G.F., Oliveira, J.C.A., Mata, R.A., Rajamohanan, P.R., Ramana, C.V., "<span class="pub-title">Synthesis and Structural Characterization of Homochiral Homooligomers of Parent cis- and trans-Furanoid-β-amino acids</span>," <em>Chem. Eur. J.</em> 17, 12946–12954 (2011).</li>
    <li>Ryde, U., Mata, R.A., Grimme, S., "<span class="pub-title">Does DFT-D estimate accurate energies for the binding of ligands to metal complexes?</span>," <em>Dalton Trans.</em> 40, 11176–11183 (2011).</li>
    <li>Quinto-Hernandez, A., Lee, Y.Y., Huang, T.-P., Pan, W.-C., Min-Lin, J., Mata, R.A., Wodtke, A.M., "<span class="pub-title">Photoionization of CH3N3 produces 3B2 N3-: A theoretical and experimental study of the ion-pair channel</span>," <em>J. Phys. Chem. Lett.</em> 2, 2311–2315 (2011).</li>
    <li>Mata, R.A., Stoll, H., "<span class="pub-title">An incremental correlation approach to excited state energies based on natural transition/localized orbitals</span>," <em>J. Chem. Phys.</em> 134, 034122 (2011).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2010</h2>
  <ul class="pub-list">
    <li>Mata, R.A., "<span class="pub-title">Application of high level wavefunction methods in quantum mechanics/molecular mechanics hybrid schemes</span>," <em>Phys. Chem. Chem. Phys.</em> 12, 5041–5052 (2010).</li>
    <li>Mata, R.A., "<span class="pub-title">Assessing the accuracy of many-body expansions for the computation of solvatochromic shifts</span>," <em>Mol. Phys.</em> 108, 381–392 (2010).</li>
    <li>Mata, R.A., Costa Cabral, B.J., "<span class="pub-title">QM/MM approaches to the electronic spectra of hydrogen bonding systems with connection to many-body decomposition schemes</span>," <em>Adv. Quantum Chem.</em> 59, Ch. 4, 99–144 (2010).</li>
    <li>Dieterich, J.M., Werner, H.-J., Mata, R.A., Metz, S., Thiel, W., "<span class="pub-title">Reductive half-reaction of Aldehyde Oxidoreductase toward acetaldehyde: ab initio and free energy QM/MM calculations</span>," <em>J. Chem. Phys.</em> 132, 035101 (2010).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2009</h2>
  <ul class="pub-list">
    <li>Galamba, N., Mata, R.A., Costa Cabral, B.J., "<span class="pub-title">Electronic Excitation of Cl− in Liquid Water and at the Surface of a Cluster: A Sequential Born-Oppenheimer Molecular Dynamics/Quantum Mechanics Approach</span>," <em>J. Phys. Chem. A</em> 113, 14684 (2009).</li>
    <li>Mata, R.A., Stoll, H., Costa Cabral, B.J., "<span class="pub-title">A simple one-body approach to the calculation of the first electronic absorption band of water</span>," <em>J. Chem. Theory Comput.</em> 5, 1829 (2009).</li>
    <li>Mata, R.A., Costa Cabral, B.J., Millot, C., Coutinho, K., Canuto, S., "<span class="pub-title">Dynamic polarizability, Cauchy moments, and the optical absorption spectrum of liquid water: A sequential molecular dynamics/quantum mechanical approach</span>," <em>J. Chem. Phys.</em> 130, 014505 (2009).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2008</h2>
  <ul class="pub-list">
    <li>Mata, R.A., Stoll, H., "<span class="pub-title">Incremental expansions for SCF interaction energies: A comparison for hydrogen-bonded clusters</span>," <em>Chem. Phys. Lett.</em> 465, 136 (2008).</li>
    <li>Kaminsky, J., Mata, R.A., Werner, H.-J., Jensen, F., "<span class="pub-title">The accuracy of local MP2 methods for conformational energies</span>," <em>Mol. Phys.</em> 106, 1899 (2008).</li>
    <li>Mata, R.A., Schütz, M., Werner, H.-J., "<span class="pub-title">Correlation regions within a localized molecular orbital approach</span>," <em>J. Chem. Phys.</em> 128, 144106 (2008).</li>
    <li>Mata, R.A., Werner, H.-J., Thiel, S., Thiel, W., "<span class="pub-title">Toward accurate barriers for enzymatic reactions: QM/MM case study on p-hydroxybenzoate hydroxylase</span>," <em>J. Chem. Phys.</em> 128, 025104 (2008).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2007</h2>
  <ul class="pub-list">
    <li>Mata, R.A., Werner, H.-J., "<span class="pub-title">Local correlation methods with a natural localized molecular orbital basis</span>," <em>Mol. Phys.</em> 105, 2753 (2007).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2006</h2>
  <ul class="pub-list">
    <li>Mata, R.A., Werner, H.-J., "<span class="pub-title">Computation of smooth Potential Surfaces using Local Correlation Methods</span>," <em>J. Chem. Phys.</em> 125, 184110 (2006).</li>
    <li>Claeyssens, F., Harvey, J.N., Manby, F.R., Mata, R.A., Mulholland, A.J., Ranaghan, K.E., Schütz, M., Thiel, S., Thiel, W., Werner, H.-J., "<span class="pub-title">High accuracy computation of reaction barriers in enzymes</span>," <em>Angew. Chem. Int. Ed.</em> 45, 6856–6859 (2006).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2005</h2>
  <ul class="pub-list">
    <li>Riedel, S., Pyykkö, P., Mata, R.A., Werner, H.-J., "<span class="pub-title">Comparative calculations for the A-frame molecules [S(MPH3)2] (M = Cu, Ag, Au) at levels up to CCSD(T)</span>," <em>Chem. Phys. Lett.</em> 405, 148 (2005).</li>
  </ul>
</section>

<section class="pub-year">
  <h2>2004</h2>
  <ul class="pub-list">
    <li>Mata, R.A., Costa Cabral, B.J., "<span class="pub-title">Structural, energetic, and electronic properties of (CH3CN)2–8 clusters by density functional theory</span>," <em>J. Mol. Struct. (THEOCHEM)</em> 673, 155–164 (2004).</li>
  </ul>
</section>
```

**Step 2: Commit**

```bash
git add publications.html
git commit -m "feat: add complete publications page 2004–2024"
```

---

### Task 7: software.html — Software tools

**Files:**
- Create: `software.html`

**Step 1: Create software.html**

Use the shared template. Body content:

```html
<div class="page-header">
  <h1>Software</h1>
  <p>Computational tools developed by the group</p>
</div>

<div class="software-cards">

  <div class="software-card">
    <h3>PMC</h3>
    <div class="meta">Perturbative QM/MM Monte Carlo Package &mdash; Jonas Feldt</div>
    <p>
      A suite of programs for QM/MM simulations of molecules in solution.
      Employs fast sampling of the solvent space through first-order perturbation theory
      with hybrid CPU-GPU computation. Interfaces directly with Molpro.
    </p>
    <div class="links">
      <a href="https://bitbucket.org/jonas-feldt/mc-ocl/wiki/Home" target="_blank" rel="noopener">
        Bitbucket ↗
      </a>
    </div>
    <p style="font-size:0.82rem; margin-top:0.75rem; color:#555">
      References: <em>Int. J. High Perform. Comput. Appl.</em> 31, 499–516 (2017);
      <em>J. Chem. Phys.</em> 147, 244105 (2017)
    </p>
  </div>

  <div class="software-card">
    <h3>QVib / QVib-Fit</h3>
    <div class="meta">Anharmonic Frequency Program &mdash; Benjamin Schröder</div>
    <p>
      Programs for calculating anharmonic frequencies and wave functions from
      normal mode calculations in a low-dimensional space. Based on original
      code from Prof. Peter Botschwina (University of Göttingen).
      QVib-Fit provides fitting capabilities for potential energy surfaces.
    </p>
  </div>

  <div class="software-card">
    <h3>Atomdroid</h3>
    <div class="meta">Mobile Molecular Mechanics Viewer &amp; Builder</div>
    <p>
      A mobile viewer, builder, and molecular mechanics simulator for Android devices.
      Features a molecular structure database and optimized visualization for large PDB files.
      Useful for teaching and quick structural inspection on mobile platforms.
    </p>
    <div class="links">
      <a href="https://play.google.com/store/apps/details?id=org.atomdroid" target="_blank" rel="noopener">
        Google Play ↗
      </a>
    </div>
    <p style="font-size:0.82rem; margin-top:0.75rem; color:#555">
      Reference: <em>J. Chem. Inf. Model.</em> 52, 1072–1078 (2012)
    </p>
  </div>

</div>
```

**Step 2: Commit**

```bash
git add software.html
git commit -m "feat: add software page with PMC, QVib, Atomdroid"
```

---

### Task 8: teaching.html — Placeholder

**Files:**
- Create: `teaching.html`

**Step 1: Create teaching.html**

```html
<!-- body content -->
<div class="page-header">
  <h1>Teaching</h1>
</div>
<div class="placeholder-note">
  <p>Teaching information will be added here.</p>
  <p>For current course offerings, please visit the
    <a href="https://www.uni-goettingen.de/de/123987.html" target="_blank" rel="noopener">
      university page ↗
    </a>
  </p>
</div>
```

**Step 2: Commit**

```bash
git add teaching.html
git commit -m "feat: add teaching placeholder page"
```

---

### Task 9: links.html — External links

**Files:**
- Create: `links.html`

**Step 1: Create links.html**

```html
<!-- body content -->
<div class="page-header">
  <h1>Links</h1>
  <p>Useful links related to our work</p>
</div>

<div class="link-group">
  <h3>Georg-August-Universität Göttingen</h3>
  <ul>
    <li><a href="https://www.uni-goettingen.de/en/faculty+of+chemistry/8065.html" target="_blank" rel="noopener">Faculty of Chemistry</a></li>
    <li><a href="https://www.uni-goettingen.de/de/institut+f%C3%BCr+physikalische+chemie/8082.html" target="_blank" rel="noopener">Institut für Physikalische Chemie (IPC)</a></li>
    <li><a href="https://www.uni-goettingen.de/de/123987.html" target="_blank" rel="noopener">Group page at uni-goettingen.de</a></li>
  </ul>
</div>

<div class="link-group">
  <h3>Research Networks</h3>
  <ul>
    <li><a href="https://www.uni-goettingen.de/de/bench/560231.html" target="_blank" rel="noopener">BENCh — Benchmark Experiments for Numerical Quantum Chemistry (RTG 2455)</a></li>
    <li><a href="https://www.uni-goettingen.de/de/sfb-1633/623320.html" target="_blank" rel="noopener">SFB 1633 — Reactive Intermediates</a></li>
    <li><a href="https://github.com/cchembio" target="_blank" rel="noopener">Group GitHub (cchembio)</a></li>
  </ul>
</div>

<div class="link-group">
  <h3>Computational Chemistry Resources</h3>
  <ul>
    <li><a href="https://www.molpro.net" target="_blank" rel="noopener">Molpro — Quantum Chemistry Package</a></li>
    <li><a href="https://www.orca-quantum.de" target="_blank" rel="noopener">ORCA — Electronic Structure Program</a></li>
    <li><a href="https://www.chemspider.com" target="_blank" rel="noopener">ChemSpider — Chemical Structure Database</a></li>
  </ul>
</div>
```

**Step 2: Commit**

```bash
git add links.html
git commit -m "feat: add links page"
```

---

### Task 10: Final commit — docs and initial setup

**Step 1: Stage and commit all remaining files**

```bash
git add docs/
git commit -m "docs: add design doc and implementation plan"
```

**Step 2: Verify the full file tree**

```bash
find . -not -path './.git/*' -type f | sort
```

Expected output should include all 9 HTML files, `css/style.css`, `js/main.js`, and the docs.

---

## Notes for Implementer

- The shared `<header>` and `<footer>` blocks are identical across all 9 pages — copy them exactly.
- The `<main class="container">` wraps all body content.
- For the `index.html` two-column layout, the `<main>` tag does NOT include the `.home-grid` wrapper — that wrapper is inside `<main>`.
- The publications page has no active nav link highlighted; all other pages should add `class="active"` to their own nav `<a>` tag if desired (optional).
- The Google Scholar link in `publications.html` uses a placeholder URL — update `SCHOLAR_ID` once known.
- Images directory is empty for now — member photos and research figures can be added later alongside the HTML.
