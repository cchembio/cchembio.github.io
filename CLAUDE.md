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
- js/main.js        — Nav toggle, publication accordion, dynamic fetching logic
- js/publications.js — Publication fetch/render engine (ORCID + Crossref + TOC figures)
- images/           — Group photos, member portraits, research figures
- images/members/   — Individual member portrait photos
- images/group/     — Group photos (lab events, outings, conferences)

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
1. **ORCID public API** — `https://pub.orcid.org/v3.0/{ORCID_ID}/works` (JSON, no auth needed)
   - Prof. Mata's ORCID: `0000-0002-2720-3364`
   - API endpoint: `https://pub.orcid.org/v3.0/0000-0002-2720-3364/works`
2. **Crossref API** — used to enrich each entry with full metadata (title, journal, volume, pages, year)
   - `https://api.crossref.org/works/{DOI}`
3. **Static fallback** — `data/publications.json` committed in the repo, used if APIs are unavailable
   - This file should always be kept up to date as a reliable offline baseline

### TOC (Table of Contents) figures
- After fetching a DOI, attempt to retrieve the TOC/graphical abstract image from the publisher.
- **Unpaywall / Open Access Button** can sometimes provide open-access landing page URLs.
- **Crossref** returns a `link` array; check for entries with `content-type: image/*` or `intended-application: syndication`.
- If a TOC image URL is found, display it as a small thumbnail (max 120px wide) beside the citation.
- If no image is available, render the entry without a thumbnail — never show a broken image.
- Cache fetched image URLs in `sessionStorage` to avoid re-fetching on the same visit.

### Accordion behaviour
- On page load, **only the current year's section is expanded**; all other years are collapsed.
- Each year heading is a clickable toggle (`<button>` or `<summary>`) that expands/collapses that year's list.
- Collapsed sections show only the year heading and entry count, e.g. "2023 (14 publications)".
- Smooth CSS transition for expand/collapse (max-height or details/summary).
- The current year section loads immediately; other years fetch/render lazily when first opened.

### Performance
- Fetch calls are batched: first load the ORCID list, then enrich only the visible (current year) entries immediately; enrich hidden years lazily on expand.
- Use `sessionStorage` to cache API responses within a single visit.
- Show a loading spinner per year section while fetching.
- Graceful degradation: if all APIs fail, render from `data/publications.json` silently.

## Member Photos
- Each member card on members.html should display a portrait photo.
- Photos live at `images/members/{firstname}-{lastname}.jpg` (lowercase, hyphenated).
- If no photo file exists for a member, display a neutral SVG silhouette placeholder.
- Do not use external avatar services.
- Group photos live at `images/group/` and are shown in a masonry or grid gallery at the bottom of members.html.
- Photo filenames for group photos: `group-{YYYY}-{description}.jpg`.