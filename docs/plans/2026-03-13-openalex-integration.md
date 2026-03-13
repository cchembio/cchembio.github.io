# OpenAlex Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ORCID as the publication discovery source with OpenAlex so that pre-ORCID papers appear in the publications list.

**Architecture:** Two new functions (`fetchOpenAlexAuthorId`, `fetchOpenAlex`) are added to `js/publications.js` and replace `fetchORCID` as the primary source in `initPublications`. OpenAlex discovers all DOIs (including pre-ORCID papers); Crossref enrichment, rendering, and fallback logic are untouched.

**Tech Stack:** Vanilla ES2017 JavaScript, OpenAlex REST API (`api.openalex.org`), existing Crossref pipeline.

---

## Context for the implementer

**File to edit:** `js/publications.js` (309 lines)

**Key existing constants (lines 10–15):**
```js
const ORCID_ID   = '0000-0002-2720-3364';
const ORCID_URL  = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF   = doi => `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=rmata@gwdg.de`;
const FALLBACK   = 'data/publications.json';
const CACHE_KEY  = 'pub_cache_v7';
const CURRENT_YEAR = new Date().getFullYear();
```

**`fetchORCID()` lives at lines 36–82.** It returns `[{ doi, year, title, type }]`.

**`initPublications()` lives at lines 252–308.** Its current try/catch block (lines 260–270) calls `fetchORCID()`.

**No automated test runner.** Manual verification is done by opening `publications.html` in a browser (use `python3 -m http.server 8000` from the repo root) and inspecting the Network tab and console.

---

### Task 1: Add OpenAlex constants and `fetchOpenAlexAuthorId()`

**Files:**
- Modify: `js/publications.js:10-15` (add constants)
- Modify: `js/publications.js:82` (insert new function after `fetchORCID`)

**Step 1: Add OpenAlex URL constants after line 15**

Replace lines 10–15:
```js
const ORCID_ID   = '0000-0002-2720-3364';
const ORCID_URL  = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF   = doi => `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=rmata@gwdg.de`;
const FALLBACK   = 'data/publications.json';
const CACHE_KEY  = 'pub_cache_v7';
const CURRENT_YEAR = new Date().getFullYear();
```

With:
```js
const ORCID_ID   = '0000-0002-2720-3364';
const ORCID_URL  = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF   = doi => `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=rmata@gwdg.de`;
const FALLBACK   = 'data/publications.json';
const CACHE_KEY  = 'pub_cache_v8';
const CURRENT_YEAR = new Date().getFullYear();

const OPENALEX_AUTHOR_URL = `https://api.openalex.org/authors?filter=orcid:${ORCID_ID}&mailto=rmata@gwdg.de`;
const OPENALEX_WORKS = (authorId, cursor) =>
  `https://api.openalex.org/works?filter=authorships.author.id:${authorId},type:journal-article&per_page=200&cursor=${encodeURIComponent(cursor)}&mailto=rmata@gwdg.de`;
```

**Step 2: Add `fetchOpenAlexAuthorId()` after `fetchORCID()` (after line 82)**

Insert this function between the closing `}` of `fetchORCID` and the `/* ── Crossref enrichment */` comment:

```js
/* ── OpenAlex fetch ─────────────────────────────────────────── */

async function fetchOpenAlexAuthorId() {
  const cacheKey = CACHE_KEY + '_oalex_id';
  const cached = sessionGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(OPENALEX_AUTHOR_URL);
  if (!res.ok) throw new Error(`OpenAlex author lookup ${res.status}`);
  const data = await res.json();
  const author = (data.results || [])[0];
  if (!author?.id) throw new Error('OpenAlex: author not found');

  // Strip URL prefix: "https://openalex.org/A2345678901" -> "A2345678901"
  const id = author.id.replace('https://openalex.org/', '');
  sessionSet(cacheKey, id);
  return id;
}
```

**Step 3: Manually verify the author ID lookup**

Start a local server from the repo root:
```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/publications.html` in a browser.

Open DevTools → Console. Run:
```js
fetchOpenAlexAuthorId().then(id => console.log('Author ID:', id))
```

Expected: logs something like `Author ID: A2050296018` (a string starting with `A` followed by digits).

If it throws, check the Network tab for the request to `api.openalex.org/authors` and inspect the response.

**Step 4: Commit**

```bash
git add js/publications.js
git commit -m "feat: add OpenAlex constants and fetchOpenAlexAuthorId"
```

---

### Task 2: Add `fetchOpenAlex()` with cursor pagination

**Files:**
- Modify: `js/publications.js` (insert after `fetchOpenAlexAuthorId`)

**Step 1: Add `fetchOpenAlex()` immediately after `fetchOpenAlexAuthorId()`**

```js
async function fetchOpenAlex() {
  const cacheKey = CACHE_KEY + '_oalex';
  const cached = sessionGet(cacheKey);
  if (cached) return cached;

  const REPO_PREFIXES = ['10.3204/', '10.25625/', '10.17877/', '10.5281/'];

  const authorId = await fetchOpenAlexAuthorId();

  const allWorks = [];
  let cursor = '*';

  while (cursor) {
    const res = await fetch(OPENALEX_WORKS(authorId, cursor));
    if (!res.ok) throw new Error(`OpenAlex works ${res.status}`);
    const data = await res.json();

    const works = (data.results || []).map(w => {
      // DOI in OpenAlex is a full URL: "https://doi.org/10.xxx/..." — strip the prefix
      const rawDoi = w.doi || '';
      const doi = rawDoi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase().trim() || null;
      const year  = w.publication_year || null;
      const title = w.title || '';
      return { doi, year, title };
    }).filter(w =>
      w.doi && w.year &&
      !REPO_PREFIXES.some(p => w.doi.startsWith(p))
    );

    allWorks.push(...works);

    // OpenAlex cursor pagination: null next_cursor means last page
    cursor = data.meta?.next_cursor ?? null;
  }

  // Deduplicate by DOI
  const seen = new Set();
  const unique = allWorks.filter(w => {
    if (seen.has(w.doi)) return false;
    seen.add(w.doi);
    return true;
  });

  sessionSet(cacheKey, unique);
  return unique;
}
```

**Step 2: Manually verify the works fetch**

With the local server running, open DevTools Console and run:
```js
fetchOpenAlex().then(works => {
  console.log('Total works:', works.length);
  console.log('Years:', [...new Set(works.map(w => w.year))].sort());
  console.log('Oldest:', works.reduce((a, b) => a.year < b.year ? a : b));
})
```

Expected output:
- `Total works:` should be **more** than the ORCID count (was ~150 from ORCID; OpenAlex should add older papers)
- `Years:` array should include years before 2012 (pre-ORCID era)
- `Oldest:` should show a paper from early in Prof. Mata's career

If `Total works` is 0, check the Network tab for the works request and inspect the `meta` and `results` fields.

**Step 3: Commit**

```bash
git add js/publications.js
git commit -m "feat: add fetchOpenAlex with cursor pagination"
```

---

### Task 3: Wire OpenAlex into `initPublications()` and update HTML

**Files:**
- Modify: `js/publications.js:252-270` (initPublications try/catch block)
- Modify: `publications.html:67` (script tag version)
- Modify: `publications.html:31-35` (attribution text)

**Step 1: Replace the try/catch block in `initPublications()`**

Current code (lines ~260–270):
```js
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
```

Replace with:
```js
  let allWorks;
  try {
    allWorks = await fetchOpenAlex();
  } catch (e) {
    console.warn('OpenAlex failed, trying ORCID:', e);
    try {
      allWorks = await fetchORCID();
    } catch (e2) {
      console.warn('ORCID failed, using fallback:', e2);
      try {
        allWorks = await fetchFallback();
      } catch (e3) {
        container.innerHTML = '<p class="pub-error">Could not load publications. Please try again later.</p>';
        return;
      }
    }
  }
```

**Step 2: Update the attribution text in `publications.html`**

Current (lines 31–35):
```html
      <p>Dynamically loaded from
        <a href="https://orcid.org/0000-0002-2720-3364" target="_blank" rel="noopener">ORCID</a>
        and enriched via
        <a href="https://www.crossref.org" target="_blank" rel="noopener">Crossref</a>.
      </p>
```

Replace with:
```html
      <p>Dynamically loaded from
        <a href="https://openalex.org" target="_blank" rel="noopener">OpenAlex</a>
        and enriched via
        <a href="https://www.crossref.org" target="_blank" rel="noopener">Crossref</a>.
      </p>
```

**Step 3: Bump the script tag version in `publications.html`**

Current (line 67):
```html
  <script src="js/publications.js?v=7"></script>
```

Replace with:
```html
  <script src="js/publications.js?v=8"></script>
```

**Step 4: Full end-to-end manual verification**

Clear sessionStorage first to force fresh fetch:
```js
sessionStorage.clear()
```
Then reload `http://localhost:8000/publications.html`.

Check:
1. Page shows a loading spinner briefly, then renders publications grouped by year
2. Current year section is open; other years are collapsed
3. Open the oldest year section — confirm papers from pre-2012 appear that were missing before
4. No console errors (warnings about rate limits are OK)
5. DOI links work for a few spot-checked entries

**Step 5: Commit**

```bash
git add js/publications.js publications.html
git commit -m "feat: wire OpenAlex as primary publication source, ORCID as fallback"
```

---

### Task 4: Push and verify on GitHub Pages

**Step 1: Push to main**

```bash
git push
```

**Step 2: Wait ~2 minutes for GitHub Pages to deploy, then verify**

Open `https://cchembio.github.io/publications.html` in a fresh private/incognito window (to bypass browser cache).

Check:
1. Publications load from OpenAlex (not static fallback)
2. Pre-ORCID papers appear in older year sections
3. No broken UI or console errors

**Step 3: Done** — if everything looks good, no further action needed.
