/**
 * publications.js
 * Fetches publications from OpenAlex (primary), ORCID (fallback), enriches via Crossref, renders accordion.
 * Falls back to data/publications.json if all APIs are unavailable.
 *
 * OpenAlex: https://api.openalex.org/authors?filter=orcid:0000-0002-2720-3364
 * ORCID:    https://pub.orcid.org/v3.0/0000-0002-2720-3364/works
 * Crossref: https://api.crossref.org/works/{DOI}
 */

const ORCID_ID   = '0000-0002-2720-3364';
const ORCID_URL  = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF   = doi => `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=rmata@gwdg.de`;
const FALLBACK   = 'data/publications.json';
const CACHE_KEY  = 'pub_cache_v8';
const CURRENT_YEAR = new Date().getFullYear();

const OPENALEX_AUTHOR_URL = `https://api.openalex.org/authors?filter=orcid:${ORCID_ID}&mailto=rmata@gwdg.de`;
const OPENALEX_WORKS = (authorId, cursor) =>
  `https://api.openalex.org/works?filter=authorships.author.id:${authorId},type:journal-article&per_page=200&cursor=${encodeURIComponent(cursor)}&mailto=rmata@gwdg.de`;

const REPO_PREFIXES = ['10.3204/', '10.25625/', '10.17877/', '10.5281/'];

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

  // Only include peer-reviewed journal articles
  const PUB_TYPES = new Set(['journal-article']);

  // Each group may have multiple DOIs; prefer one not from a repo prefix
  const works = (data.group || []).map(group => {
    const summary = group['work-summary']?.[0];
    const type    = summary?.type || '';
    const extIds  = summary?.['external-ids']?.['external-id'] || [];
    const doiObjs = extIds.filter(e => e['external-id-type'] === 'doi');
    const preferred = doiObjs.find(e => {
      const v = e['external-id-value']?.toLowerCase().trim() || '';
      return v && !REPO_PREFIXES.some(p => v.startsWith(p));
    });
    const doiObj  = preferred || doiObjs[0];
    const doi     = doiObj?.['external-id-value']?.toLowerCase().trim() || null;
    const year    = parseInt(summary?.['publication-date']?.year?.value) || null;
    const title   = summary?.title?.title?.value || '';
    return { doi, year, title, type };
  }).filter(w =>
    w.doi && w.year &&
    PUB_TYPES.has(w.type) &&
    !REPO_PREFIXES.some(p => w.doi.startsWith(p))
  );

  // Deduplicate by DOI
  const seen = new Set();
  const unique = works.filter(w => {
    if (seen.has(w.doi)) return false;
    seen.add(w.doi); return true;
  });

  sessionSet(CACHE_KEY + '_orcid', unique);
  return unique;
}

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
  const id = author.id.replace(/^https?:\/\/openalex\.org\//i, '');
  sessionSet(cacheKey, id);
  return id;
}

async function fetchOpenAlex() {
  const cacheKey = CACHE_KEY + '_oalex';
  const cached = sessionGet(cacheKey);
  if (cached) return cached;

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

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Like esc() but allows safe inline formatting tags for titles
function escTitle(str) {
  return esc(str).replace(
    /&lt;(\/?(?:sub|sup|i|em|b|strong))&gt;/g,
    '<$1>'
  );
}

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
    ? ` <a class="pub-doi" href="https://doi.org/${esc(pub.doi)}" target="_blank" rel="noopener">[DOI]</a>`
    : '';

  body.innerHTML =
    `${authors ? `${esc(authors)}, ` : ''}"<span class="pub-title">${escTitle(title)}</span>,"` +
    (journal ? ` <em>${esc(journal)}</em>${esc(vol)}${esc(pages)}${esc(year)}.` : '') +
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
