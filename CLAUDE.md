# Project: Computerchemie und Biochemie - Group Website

## Context
This is a static GitHub Pages website for the research group "Computerchemie und Biochemie" 
led by Prof. Dr. Ricardo Mata at the Georg-August-Universität Göttingen, 
Institut für Physikalische Chemie.

## Tech Stack
- Static HTML/CSS site (no framework, no build step)
- GitHub Pages hosting at cchembio.github.io
- Vanilla JavaScript for nav toggle, publication accordion, and dynamic publication fetching
- Visually engaging academic design — professional but with personality; not flat/corporate

## Site Structure
- index.html        — Home / Introduction (includes group photo)
- research.html     — Research topics (Enzymatic Systems, Reactivity, Local Correlation Methods)
- members.html      — Group members with photos, contact info, and a group photos gallery section
- publications.html — Dynamic publication list fetched client-side, organized by year with accordion
- software.html     — Group software (PMC, QVib, Atomdroid)
- teaching.html     — Teaching information
- links.html        — Useful links
- css/style.css     — All styles
- js/main.js        — Nav toggle and general UI
- js/publications.js — Publication fetch/render engine (OpenAlex → ORCID → Crossref + TOC figures)
- scripts/fetch-tocs.py — Maintenance script: downloads TOC images locally (run from repo root)
- data/tocs.json    — Manifest mapping DOI → local image filename (produced by fetch-tocs.py)
- data/publications.json — Static fallback publication list (keep up to date)
- images/           — Group photos, member portraits, research figures
- images/members/   — Individual member portrait photos
- images/group/     — Group photos (lab events, outings, conferences)
- images/tocs/      — Locally cached TOC/graphical abstract images (produced by fetch-tocs.py)

## Design Principles
- Responsive (mobile-friendly)
- Fast loading, minimal dependencies
- Visually engaging: hero section on home page, subtle animations, card hover effects, section dividers
- University-appropriate color scheme: Göttingen blue #003d73 primary, gold #c8a951 accent
- Navigation bar linking all pages + link to GitHub repos
- Footer with contact info for Prof. Mata and link to university page
- Link to GitHub repositories (github.com/cchembio) in nav or software page
- Member cards include a portrait photo (placeholder silhouette if no photo available)
- Group photos gallery section on members.html
- A group photo or hero image prominently on index.html

## Content Source
The content mirrors https://cchembio.uni-goettingen.de with the following pages:
- Forschung: https://uni-goettingen.de/de/forschung/123988.html
- Mitglieder: https://uni-goettingen.de/de/mitglieder/123989.html
- Publikationen: https://uni-goettingen.de/de/publikationen/123990.html
- Software: https://uni-goettingen.de/de/software/592327.html

## Important
- Keep all content in English (the university site has English versions)
- Publications should link to DOIs
- Software entries should link to their repositories where available
- Add a prominent link to the GitHub organization/repos

## Publications — Dynamic Retrieval
Publications are fetched client-side at page load using public APIs. No server required.

### Data source (in priority order)
1. **OpenAlex API** (primary) — retrieves all works attributed to Prof. Mata's ORCID via cursor pagination
   - Author lookup: `https://api.openalex.org/authors?filter=orcid:0000-0002-2720-3364`
   - Works: `https://api.openalex.org/works?filter=authorships.author.id:{id},type:article`
2. **ORCID public API** (fallback if OpenAlex fails) — `https://pub.orcid.org/v3.0/0000-0002-2720-3364/works`
   - Prof. Mata's ORCID: `0000-0002-2720-3364`
3. **Crossref API** — enriches each entry with full metadata (title, journal, volume, pages, year, TOC image URL)
   - `https://api.crossref.org/works/{DOI}`
4. **Static fallback** — `data/publications.json` committed in the repo, used if all APIs are unavailable
   - Keep this file up to date as a reliable offline baseline

### TOC (Table of Contents) figures
- TOC/graphical abstract images are pre-downloaded locally by `scripts/fetch-tocs.py` (run manually as needed).
  - Images are saved to `images/tocs/` and indexed in `data/tocs.json` (maps DOI → filename).
  - Run: `pip install requests cloudscraper Pillow && python3 scripts/fetch-tocs.py` from repo root.
  - The script is re-runnable; already-downloaded images are skipped.
- At render time, `publications.js` checks `data/tocs.json` first; if no local image exists, it falls back to a Crossref-provided image URL.
- If no image is available at all, the entry renders without a thumbnail — never show a broken image.

### Accordion behaviour
- On page load, **only the current year's section is expanded**; all other years are collapsed.
- Each year heading is a clickable toggle (`<button>` or `<summary>`) that expands/collapses that year's list.
- Collapsed sections show only the year heading and entry count, e.g. "2023 (14 publications)".
- Smooth CSS transition for expand/collapse (max-height or details/summary).
- The current year section loads immediately; other years fetch/render lazily when first opened.

### Performance
- Fetch calls are batched: first load the OpenAlex list, then enrich only the visible (current year) entries immediately; enrich hidden years lazily on expand.
- Use `sessionStorage` to cache API responses within a single visit. The cache key is versioned (`pub_cache_vN` in `publications.js`). **Bump the version number** whenever you change the data schema or title rendering logic, and also update the `?v=N` query string on the `<script>` tag in `publications.html` to bust browser cache.
- Show a loading spinner per year section while fetching.
- Graceful degradation: if all APIs fail, render from `data/publications.json` silently.

## Pages to Extend

### research.html
The research page currently lists topics (Enzymatic Systems, Reactivity, Local Correlation Methods) but should be expanded with richer content:
- Each research area should have a dedicated section with a short descriptive paragraph and at least one figure or schematic illustrating the topic.
- Figures live in `images/research/` (create directory if absent); use descriptive filenames like `enzymatic-qmmm.png`.
- Consider adding a short "highlights" or "recent results" block linking to key publications.
- The page should feel visually engaging — not just a bulleted list. Use cards, section dividers, or side-by-side image+text layouts consistent with the rest of the site.

### teaching.html
The teaching page should go beyond a bare list of courses:
- Each course entry should include: course name, level (BSc/MSc/PhD), a one-sentence description, and ideally a link to course materials or the university course catalog.
- Consider grouping by type (lectures, seminars, practical courses).
- A short section on thesis opportunities (BSc, MSc, PhD) would add value.

### Visuals and imagery
- Prefer actual figures, schematics, or photos over placeholder text.
- Research figures should be publication-quality or close to it (PNG or SVG preferred).
- Do not use stock photos or generic icons; all imagery should reflect the group's actual work or environment.

## Member Photos
- Each member card on members.html should display a portrait photo.
- Photos live at `images/members/{firstname}-{lastname}.jpg` (lowercase, hyphenated).
- If no photo file exists for a member, display a neutral SVG silhouette placeholder.
- Do not use external avatar services.
- Group photos live at `images/group/` and are shown in a masonry or grid gallery at the bottom of members.html.
- Photo filenames for group photos: `group-{YYYY}-{description}.jpg`.