# Design: cchembio.github.io Static Website

**Date:** 2026-03-12
**Project:** Computerchemie und Biochemie group website
**Author:** Ricardo Mata / Claude Code

---

## Overview

A clean, academic static website for the Computerchemie und Biochemie research group
(Prof. Dr. Ricardo Mata, Georg-August-Universität Göttingen) hosted on GitHub Pages at
cchembio.github.io. No framework, no build step, vanilla HTML/CSS/JS only.

---

## Architecture

```
cchembio.github.io/
├── index.html           — Home / group introduction
├── research.html        — Three research areas
├── members.html         — All group members
├── publications.html    — Full list 2004–2024, by year
├── software.html        — PMC, QVib/QVib-Fit, Atomdroid
├── teaching.html        — Placeholder
├── links.html           — External links
├── css/
│   └── style.css        — All styles (single shared file)
├── js/
│   └── main.js          — Minimal JS: mobile nav toggle
├── images/              — Photos, figures (populated separately)
└── docs/plans/          — Design and implementation documents
```

---

## Visual Design (Option A — Minimalist Academic)

| Token | Value |
|---|---|
| Primary (Göttingen blue) | `#003d73` |
| Accent (Göttingen gold) | `#c8a951` |
| Background | `#ffffff` |
| Text | `#1a1a1a` |
| Muted text | `#555555` |
| Heading font | Georgia, "Times New Roman", serif |
| Body font | system-ui, -apple-system, sans-serif |
| Container max-width | 1100px, centered with auto margins |
| Nav | Sticky top, primary blue bg, white links, gold hover underline |
| Footer | Dark blue bg, white text |

### Responsive breakpoints
- Desktop: ≥ 768px — two-column home layout, full nav
- Mobile: < 768px — stacked layout, hamburger nav toggle

---

## Navigation

All pages share the same `<header>` with:
- Left: site title "Computerchemie und Biochemie" (links to index.html)
- Right: links — Home | Research | Members | Publications | Software | Teaching | Links | GitHub ↗

GitHub link points to `https://github.com/cchembio` (opens in new tab).

---

## Footer

Shared across all pages:
```
Prof. Dr. Ricardo Mata
Institut für Physikalische Chemie
Georg-August-Universität Göttingen
Tammannstraße 6, 37077 Göttingen, Germany
Phone: +49-(551) 39-23149  |  Email: rmata@gwdg.de
→ University page
```

---

## Page Designs

### index.html — Home
Two-column layout (desktop): main intro (70%) + contact sidebar (30%).
- Group introduction paragraph
- Highlights box: qmbench project, BENCh RTG2455
- Contact sidebar: address, phone, email, university link

### research.html — Research
Three `<section>` blocks, each with h2 heading + description + key publications list:
1. **Enzymatic Systems** — QM/MM on enzyme active sites, proton transfer, protein crosslinks
2. **Reactivity** — Non-covalent interactions, London dispersion, collaborative reaction pathway studies
3. **Local Correlation Methods** — Low-scaling correlated WFT, correlation regions, solvation, multicomponent

### members.html — Members
Five grouped sections:
1. Group Leader — Prof. Dr. Ricardo Mata (photo placeholder, room, phone, email)
2. Secretary — Martina Plaettner (room, phone, email)
3. Post-Doctoral Researchers — Dr. Martí Gimferrer, Dr. Benjamin Schröder
4. Doctoral Candidates — Breitenbach, Hasecke, Mäde, Meeder, Mücke, Schiebel
5. Master's & Bachelor's Students — Gehle, Henninger, Wolf, Wagner

Member cards: name, role/program affiliation, office, email.

### publications.html — Publications
One `<section>` per year, 2024 → 2004.
Each entry: authors, title (italicized), journal + volume + pages + year, DOI link.
Format: hanging indent via CSS (`padding-left: 1.5em; text-indent: -1.5em`).
Future enhancement: ORCID API or Python script to regenerate from structured data.
TOC graphics: can be added as `<img class="toc-graphic">` beside each entry later.

### software.html — Software
Three cards (bordered, slight shadow):
1. **PMC** — QM/MM Monte Carlo, Jonas Feldt, Bitbucket link
2. **QVib / QVib-Fit** — Anharmonic frequencies, Benjamin Schröder
3. **Atomdroid** — Mobile MM viewer/builder, Google Play link, DOI

### teaching.html — Teaching
Placeholder: heading + "Content coming soon" note.

### links.html — Links
Grouped link list:
- University: Faculty of Chemistry, Institut für Physikalische Chemie
- Research networks: GöBench / BENCh RTG2455, SFB 1633
- Related tools / databases

---

## JavaScript (js/main.js)

Single responsibility: mobile hamburger menu toggle.
```js
// Toggle nav open/closed on small screens
document.querySelector('.nav-toggle').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('open');
});
```

---

## Future Enhancements (out of scope for v1)

- ORCID API client-side fetch to auto-update publications
- TOC graphics per publication entry
- Member profile photos in `images/`
- Dark mode via CSS `prefers-color-scheme`
