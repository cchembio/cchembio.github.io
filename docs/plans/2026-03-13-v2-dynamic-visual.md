# V2 — Dynamic Publications, Visual Polish, Member Photos

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the static site with dynamic ORCID-driven publications (accordion + TOC images), a visual redesign (hero, animations, card hovers), member portrait photo slots, and a group photos gallery.

**Architecture:** All logic stays client-side. `js/publications.js` fetches ORCID → enriches via Crossref → renders accordion sections. `data/publications.json` is the offline fallback. CSS gains a hero component, animation utilities, and photo grid. HTML pages are updated to use new classes/structures but keep the same nav/footer pattern.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, `@keyframes`), vanilla ES2017 JS (`async/await`, `fetch`, `sessionStorage`), ORCID public API, Crossref REST API.

---

## Reference: Shared Nav/Footer Pattern

Every HTML page uses this exact header (active class varies per page):

```html
<header>
  <nav class="navbar" aria-label="Main">
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
```

Footer (identical on all pages):
```html
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
```

---

## Task 1: data/publications.json — Static fallback

**Files:**
- Create: `data/publications.json`

The JSON is an array of publication objects. Each object:
```json
{
  "doi": "10.1021/acs.jpca.4c01361",
  "title": "The Fe-MAN Challenge: ...",
  "authors": "Rahrt, R., Hein-Janke, B., et al.",
  "journal": "J. Phys. Chem. A",
  "year": 2024,
  "volume": "",
  "pages": "",
  "toc_image": null
}
```

Write the complete array with ALL publications from 2004–2024, using the data already in `publications.html`. For entries without a DOI, set `"doi": null`.

After writing, verify:
```bash
python3 -c "import json; data=json.load(open('data/publications.json')); print(len(data), 'entries'); print('Years:', sorted(set(p['year'] for p in data), reverse=True)[:5])"
```
Expected: 100+ entries, years starting with 2024.

**Step: Commit**
```bash
git add data/publications.json
git commit -m "feat: add publications.json static fallback"
```

---

## Task 2: js/publications.js — Dynamic fetch/render engine

**Files:**
- Create: `js/publications.js`

This is the core of v2. Write the complete file:

```js
/**
 * publications.js
 * Fetches publications from ORCID, enriches via Crossref, renders accordion.
 * Falls back to data/publications.json if APIs are unavailable.
 *
 * ORCID: https://pub.orcid.org/v3.0/0000-0002-2720-3364/works
 * Crossref: https://api.crossref.org/works/{DOI}
 */

const ORCID_ID   = '0000-0002-2720-3364';
const ORCID_URL  = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF   = doi => `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
const FALLBACK   = 'data/publications.json';
const CACHE_KEY  = 'pub_cache_v1';
const CURRENT_YEAR = new Date().getFullYear();

/* ── Utilities ─────────────────────────────────────────────── */

function sessionGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function sessionSet(key, val) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function spinner(label = 'Loading…') {
  const el = document.createElement('div');
  el.className = 'pub-spinner';
  el.setAttribute('aria-live', 'polite');
  el.textContent = label;
  return el;
}

/* ── ORCID fetch ────────────────────────────────────────────── */

async function fetchORCID() {
  const cached = sessionGet(CACHE_KEY + '_orcid');
  if (cached) return cached;

  const res = await fetch(ORCID_URL, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`ORCID ${res.status}`);
  const data = await res.json();

  // Each group may have multiple external-ids; grab the first DOI per group
  const works = (data.group || []).map(group => {
    const summary = group['work-summary']?.[0];
    const extIds  = summary?.['external-ids']?.['external-id'] || [];
    const doiObj  = extIds.find(e => e['external-id-type'] === 'doi');
    const doi     = doiObj?.['external-id-value']?.toLowerCase().trim() || null;
    const year    = parseInt(summary?.['publication-date']?.year?.value) || null;
    const title   = summary?.title?.title?.value || '';
    return { doi, year, title };
  }).filter(w => w.doi && w.year);

  // Deduplicate by DOI
  const seen = new Set();
  const unique = works.filter(w => {
    if (seen.has(w.doi)) return false;
    seen.add(w.doi); return true;
  });

  sessionSet(CACHE_KEY + '_orcid', unique);
  return unique;
}

/* ── Crossref enrichment ────────────────────────────────────── */

async function enrichOne(work) {
  if (!work.doi) return work;
  const cacheKey = CACHE_KEY + '_cr_' + work.doi;
  const cached = sessionGet(cacheKey);
  if (cached) return { ...work, ...cached };

  try {
    const res = await fetch(CROSSREF(work.doi));
    if (!res.ok) return work;
    const { message: m } = await res.json();

    const authors = (m.author || []).map(a =>
      a.family ? (a.given ? `${a.family}, ${a.given[0]}.` : a.family) : ''
    ).filter(Boolean).join(', ');

    const journal   = (m['container-title'] || [])[0] || m['publisher'] || '';
    const volume    = m.volume || '';
    const pages     = m.page || '';
    const year      = m.published?.['date-parts']?.[0]?.[0] || work.year;
    const title     = m.title?.[0] || work.title;

    // TOC image: look in link array for image or syndication
    let toc_image = null;
    for (const lnk of (m.link || [])) {
      const ct = lnk['content-type'] || '';
      const ia = lnk['intended-application'] || '';
      if (ct.startsWith('image/') || ia === 'syndication' || ia === 'similarity-checking') {
        // Only use if URL looks like an image
        if (/\.(jpg|jpeg|png|gif|webp)/i.test(lnk.URL) || ct.startsWith('image/')) {
          toc_image = lnk.URL;
          break;
        }
      }
    }

    const enriched = { authors, journal, volume, pages, year, title, toc_image };
    sessionSet(cacheKey, enriched);
    return { ...work, ...enriched };
  } catch {
    return work;
  }
}

async function enrichBatch(works) {
  // Enrich in parallel, max 6 concurrent to avoid rate-limiting
  const results = [];
  for (let i = 0; i < works.length; i += 6) {
    const batch = works.slice(i, i + 6).map(enrichOne);
    results.push(...await Promise.all(batch));
  }
  return results;
}

/* ── Fallback ───────────────────────────────────────────────── */

async function fetchFallback() {
  const res = await fetch(FALLBACK);
  if (!res.ok) throw new Error('fallback failed');
  return res.json();
}

/* ── Rendering ──────────────────────────────────────────────── */

function renderEntry(pub) {
  const li = document.createElement('li');
  li.className = 'pub-entry';

  const hasTOC = pub.toc_image;
  if (hasTOC) {
    const img = document.createElement('img');
    img.src = pub.toc_image;
    img.alt = 'TOC figure';
    img.className = 'pub-toc';
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    li.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'pub-body';

  const authors = pub.authors || '';
  const title   = pub.title   || '(no title)';
  const journal = pub.journal || '';
  const vol     = pub.volume  ? ` ${pub.volume}` : '';
  const pages   = pub.pages   ? `, ${pub.pages}` : '';
  const year    = pub.year    ? ` (${pub.year})` : '';
  const doiLink = pub.doi
    ? ` <a class="pub-doi" href="https://doi.org/${pub.doi}" target="_blank" rel="noopener">[DOI]</a>`
    : '';

  body.innerHTML =
    `${authors ? `${authors}, ` : ''}"<span class="pub-title">${title}</span>,"` +
    (journal ? ` <em>${journal}</em>${vol}${pages}${year}.` : '') +
    doiLink;

  li.appendChild(body);
  return li;
}

function renderYear(year, pubs, container) {
  // Find or create the year's <details> element
  let details = container.querySelector(`details[data-year="${year}"]`);
  if (!details) return; // section was removed somehow

  const ul = details.querySelector('.pub-list');
  if (!ul) return;

  // Remove spinner if present
  const sp = details.querySelector('.pub-spinner');
  if (sp) sp.remove();

  pubs.forEach(p => ul.appendChild(renderEntry(p)));

  // Update count in summary
  const summary = details.querySelector('summary');
  if (summary) {
    summary.querySelector('.pub-count').textContent = `(${pubs.length})`;
  }
}

/* ── Scaffold ───────────────────────────────────────────────── */

function scaffoldContainer(years, container) {
  container.innerHTML = '';
  years.sort((a, b) => b - a).forEach(year => {
    const details = document.createElement('details');
    details.dataset.year = year;
    details.className = 'pub-year-details';
    if (year === CURRENT_YEAR) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'pub-year-summary';
    summary.innerHTML = `<span class="pub-year-label">${year}</span> <span class="pub-count"></span>`;
    details.appendChild(summary);

    const ul = document.createElement('ul');
    ul.className = 'pub-list';
    details.appendChild(ul);

    if (year === CURRENT_YEAR) {
      details.appendChild(spinner('Loading publications…'));
    }

    container.appendChild(details);
  });
}

/* ── Main entry ─────────────────────────────────────────────── */

async function initPublications() {
  const container = document.getElementById('publications-container');
  if (!container) return;

  // Show global spinner
  container.innerHTML = '<div class="pub-spinner pub-spinner--global">Fetching publications…</div>';

  let allWorks;
  try {
    allWorks = await fetchORCID();
  } catch (e) {
    console.warn('ORCID failed, using fallback:', e);
    try {
      allWorks = await fetchFallback();
    } catch (e2) {
      container.innerHTML = '<p class="pub-error">Could not load publications. Please try again later.</p>';
      return;
    }
  }

  // Group by year
  const byYear = {};
  allWorks.forEach(w => {
    if (!w.year) return;
    (byYear[w.year] = byYear[w.year] || []).push(w);
  });
  const years = Object.keys(byYear).map(Number);

  // Build scaffold
  scaffoldContainer(years, container);

  // Enrich and render current year immediately
  if (byYear[CURRENT_YEAR]) {
    const enriched = await enrichBatch(byYear[CURRENT_YEAR]);
    renderYear(CURRENT_YEAR, enriched, container);
  }

  // Lazy-enrich other years on first open
  container.querySelectorAll('details.pub-year-details').forEach(details => {
    const year = parseInt(details.dataset.year);
    if (year === CURRENT_YEAR) return;

    let loaded = false;
    details.addEventListener('toggle', async () => {
      if (!details.open || loaded) return;
      loaded = true;

      const sp = spinner(`Loading ${year}…`);
      details.appendChild(sp);

      const enriched = await enrichBatch(byYear[year] || []);
      renderYear(year, enriched, container);
    });
  });
}

document.addEventListener('DOMContentLoaded', initPublications);
```

**Step: Verify file created**
```bash
wc -l js/publications.js
```
Expected: ~180+ lines.

**Step: Commit**
```bash
git add js/publications.js
git commit -m "feat: add dynamic publications engine (ORCID + Crossref + TOC)"
```

---

## Task 3: publications.html — Replace static list with JS shell

**Files:**
- Modify: `publications.html` (full rewrite of `<main>` content only; keep nav/footer identical)

Replace the entire `<main class="container">` block with:

```html
<main class="container">
  <div class="page-header">
    <h1>Publications</h1>
    <p>Dynamically loaded from
      <a href="https://orcid.org/0000-0002-2720-3364" target="_blank" rel="noopener">ORCID</a>
      and enriched via
      <a href="https://www.crossref.org" target="_blank" rel="noopener">Crossref</a>.
    </p>
  </div>
  <div id="publications-container" aria-live="polite">
    <noscript>
      <p>JavaScript is required to load publications dynamically.
        <a href="https://orcid.org/0000-0002-2720-3364" target="_blank" rel="noopener">
          View on ORCID ↗
        </a>
      </p>
    </noscript>
  </div>
</main>
```

Also add `<script src="js/publications.js"></script>` before `</body>` (after the existing `main.js` script tag).

**Step: Commit**
```bash
git add publications.html
git commit -m "feat: publications page now driven by publications.js"
```

---

## Task 4: CSS — Accordion, spinner, TOC image, pub entry layout

**Files:**
- Modify: `css/style.css` (append new rules at end)

Append the following to the END of `css/style.css`:

```css
/* ============================================================
   Publications — dynamic accordion
   ============================================================ */

/* Spinner */
.pub-spinner {
  color: var(--muted);
  font-size: 0.88rem;
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pub-spinner::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
.pub-spinner--global {
  font-size: 1rem;
  padding: 2rem 0;
  justify-content: center;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Year accordion */
.pub-year-details {
  border-bottom: 1px solid var(--border);
  margin-bottom: 0;
}
.pub-year-details:last-child { border-bottom: none; }

.pub-year-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0;
  user-select: none;
}
.pub-year-summary::-webkit-details-marker { display: none; }
.pub-year-summary::before {
  content: '▶';
  font-size: 0.65rem;
  color: var(--blue);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.pub-year-details[open] > .pub-year-summary::before {
  transform: rotate(90deg);
}
.pub-year-label {
  font-family: Georgia, serif;
  font-size: 1.3rem;
  color: var(--blue);
  font-weight: bold;
}
.pub-count {
  font-size: 0.82rem;
  color: var(--muted);
}
.pub-year-summary:hover .pub-year-label { color: var(--gold); }

/* Publication list inside accordion */
.pub-year-details .pub-list {
  list-style: none;
  padding: 0 0 1rem 1.25rem;
  margin: 0;
}

/* Each entry — supports optional TOC thumbnail */
.pub-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 0.92rem;
  line-height: 1.6;
}
.pub-entry:last-child { border-bottom: none; }

.pub-toc {
  width: 90px;
  min-width: 90px;
  height: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  object-fit: contain;
  background: #f9f9f9;
}

.pub-body { flex: 1; }
.pub-title { font-style: italic; }
.pub-doi   { font-size: 0.82rem; margin-left: 0.25rem; }
.pub-error { color: #c0392b; padding: 1rem 0; }

/* ============================================================
   Hero section (index.html)
   ============================================================ */
.hero {
  position: relative;
  background: var(--blue);
  color: #fff;
  padding: 5rem 1.5rem 4rem;
  text-align: center;
  overflow: hidden;
  margin-bottom: 0;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,61,115,0.92) 0%, rgba(0,42,80,0.97) 100%);
  z-index: 1;
}
.hero-bg {
  position: absolute;
  inset: 0;
  object-fit: cover;
  width: 100%;
  height: 100%;
  opacity: 0.25;
  z-index: 0;
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: var(--max-width);
  margin: 0 auto;
}
.hero h1 {
  color: #fff;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  border: none;
}
.hero p {
  color: rgba(255,255,255,0.82);
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto 1.5rem;
}
.hero-cta {
  display: inline-block;
  background: var(--gold);
  color: var(--blue);
  padding: 0.65rem 1.5rem;
  border-radius: var(--radius);
  font-weight: bold;
  font-size: 0.95rem;
  transition: background 0.2s, transform 0.15s;
  text-decoration: none;
}
.hero-cta:hover {
  background: #d4b35a;
  color: var(--blue);
  transform: translateY(-2px);
  text-decoration: none;
}
main.container.has-hero { padding-top: 0; }

/* ============================================================
   Card hover lift (member cards, software cards)
   ============================================================ */
.member-card,
.software-card {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.member-card:hover,
.software-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.1);
}

/* ============================================================
   Member portrait photo
   ============================================================ */
.member-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 3px solid var(--border);
  display: block;
}
.member-photo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--border);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ============================================================
   Group photos gallery
   ============================================================ */
.group-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.group-gallery-item {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  aspect-ratio: 4/3;
  background: var(--border);
}
.group-gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block;
}
.group-gallery-item:hover img { transform: scale(1.04); }
.group-gallery-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.82rem;
  text-align: center;
  padding: 1rem;
}

/* ============================================================
   Section dividers / visual accents
   ============================================================ */
.section-divider {
  border: none;
  height: 3px;
  background: linear-gradient(to right, var(--blue), var(--gold), transparent);
  margin: 2.5rem 0;
  border-radius: 2px;
}

/* Fade-in animation on page load */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in {
  animation: fadeInUp 0.45s ease both;
}
.fade-in-delay-1 { animation-delay: 0.1s; }
.fade-in-delay-2 { animation-delay: 0.2s; }
.fade-in-delay-3 { animation-delay: 0.3s; }

/* ============================================================
   Responsive additions
   ============================================================ */
@media (max-width: 768px) {
  .hero h1  { font-size: 1.8rem; }
  .hero p   { font-size: 1rem; }
  .pub-toc  { width: 60px; min-width: 60px; }
  .group-gallery { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
```

**Step: Verify**
```bash
wc -l css/style.css
```
Expected: ~530+ lines.

**Step: Commit**
```bash
git add css/style.css
git commit -m "feat: add hero, accordion, member photo, gallery CSS"
```

---

## Task 5: index.html — Hero section + fade-in animations

**Files:**
- Modify: `index.html`

**Change 1:** Replace `<main class="container">` with `<main class="container has-hero">`.

**Change 2:** Insert a hero section as the FIRST child inside `<main class="container has-hero">`, BEFORE the `.page-header` div:

```html
<section class="hero">
  <!-- Replace src with real group photo when available: images/group/group-photo.jpg -->
  <img class="hero-bg" src="images/group/hero.jpg" alt="" aria-hidden="true"
       onerror="this.style.display='none'">
  <div class="hero-content">
    <h1>Computerchemie und Biochemie</h1>
    <p>Quantum chemistry and computational biochemistry at the University of Göttingen</p>
    <a href="research.html" class="hero-cta">Explore our Research</a>
  </div>
</section>
```

**Change 3:** Remove the `.page-header` div that duplicates the hero title (the one with `<h1>Computerchemie und Biochemie</h1>`), since the hero now serves that role.

**Change 4:** Add `class="fade-in"` to the `.home-grid` div.

**Step: Commit**
```bash
git add index.html
git commit -m "feat: add hero section to home page"
```

---

## Task 6: members.html — Portrait photos + group gallery

**Files:**
- Modify: `members.html`

**Change 1:** Add a portrait photo (or SVG placeholder) to EVERY `.member-card`.

For each card, insert this block as the FIRST child inside `.member-card` (before the `<h3>`):

```html
<img class="member-photo"
     src="images/members/FIRSTNAME-LASTNAME.jpg"
     alt="Photo of NAME"
     onerror="this.outerHTML='<div class=\'member-photo-placeholder\' aria-hidden=\'true\'><svg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'20\' cy=\'15\' r=\'8\' fill=\'#aab\'/><ellipse cx=\'20\' cy=\'34\' rx=\'13\' ry=\'8\' fill=\'#aab\'/></svg></div>'">
```

Apply to every card with the correct filename:
- `ricardo-mata.jpg` → Prof. Dr. Ricardo Mata
- `martina-plaettner.jpg` → Martina Plaettner
- `benjamin-schroder.jpg` → Dr. Benjamin Schröder
- `marti-gimferrer.jpg` → Dr. Martí Gimferrer
- `maximilian-breitenbach.jpg` → Maximilian Breitenbach
- `lukas-hasecke.jpg` → Lukas Hasecke
- `wieland-made.jpg` → Wieland Mäde
- `lynn-meeder.jpg` → Lynn Meeder
- `maike-mucke.jpg` → Maike Mücke
- `laura-schiebel.jpg` → Laura Schiebel
- `rasmus-gehle.jpg` → Rasmus Gehle
- `steffen-henninger.jpg` → Steffen Henninger
- `samuel-wolf.jpg` → Samuel Wolf
- `elisabeth-wagner.jpg` → Elisabeth Wagner

**Change 2:** Append a group photos section at the END of `<main>`, before `</main>`:

```html
<hr class="section-divider">

<div class="members-group">
  <h2>Group Photos</h2>
  <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1rem;">
    Add photos to <code>images/group/</code> — filenames: <code>group-YYYY-description.jpg</code>
  </p>
  <div class="group-gallery" id="group-gallery">
    <!-- Photos are loaded from images/group/ — add img tags here as photos become available -->
    <div class="group-gallery-item">
      <div class="group-gallery-placeholder">
        Add group photos to<br><code>images/group/</code>
      </div>
    </div>
  </div>
</div>
```

**Step: Commit**
```bash
git add members.html
git commit -m "feat: add member portrait slots and group photo gallery"
```

---

## Task 7: Create image directory placeholders

**Files:**
- Create: `images/members/.gitkeep`
- Create: `images/group/.gitkeep`

```bash
mkdir -p images/members images/group
touch images/members/.gitkeep images/group/.gitkeep
```

**Step: Commit**
```bash
git add images/
git commit -m "chore: create member and group photo directories"
```

---

## Task 8: Final integration check

**Step 1: Verify all files exist**
```bash
ls js/publications.js data/publications.json images/members/.gitkeep images/group/.gitkeep
```

**Step 2: Test publications.js loads without syntax errors**
```bash
node --check js/publications.js
```
Expected: no output (= no syntax errors).

**Step 3: Validate publications.json is valid JSON**
```bash
python3 -c "import json; d=json.load(open('data/publications.json')); print(f'OK — {len(d)} entries')"
```

**Step 4: Verify git log**
```bash
git log --oneline -8
```
Expected: 8 commits from this plan, newest first.

**Step 5: Commit anything remaining**
```bash
git status
# Stage and commit if anything untracked
```

---

## Notes for Implementer

- `publications.js` uses `async/await` — fully supported on GitHub Pages visitors (no IE11 support needed).
- The ORCID API returns works **with duplicates** (same DOI from multiple sources like Crossref and CIÊNCIAVITAE) — the deduplication step in `fetchORCID()` is critical.
- TOC images from Crossref are rarely available in the `link` array for most publishers — the code handles missing images gracefully with `onerror` on the `<img>` tag.
- The `data/publications.json` fallback only triggers if BOTH ORCID and the page reload fail — it is a safety net, not the primary path.
- For the hero image: `images/group/hero.jpg` will silently not appear until the file is added — the `onerror` handler hides the broken `<img>` automatically.
- Member portrait `onerror` uses escaped single quotes in the inline `outerHTML` string — this is intentional and syntactically correct.
