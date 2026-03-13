# OpenAlex Integration Design

**Date:** 2026-03-13
**Goal:** Replace ORCID as the publication discovery source with OpenAlex, which covers pre-ORCID papers matched by author name in addition to ORCID-linked papers.

---

## Problem

The ORCID public API only returns papers the author has explicitly linked to their ORCID profile. Older pre-ORCID papers (before ~2012) are missing even though they exist in Crossref, PubMed, and other databases. OpenAlex has a complete author profile for Prof. Mata including these older papers.

## Decision

Use OpenAlex as the primary publication discovery layer. Crossref enrichment pipeline is unchanged — OpenAlex only replaces ORCID as the source of the DOI list.

## Architecture

```
OpenAlex (DOI discovery)
  └─> Crossref (metadata enrichment: authors, journal, volume, pages, TOC image)
        └─> renderEntry() / renderYear() / scaffoldContainer() [unchanged]

Fallback chain: OpenAlex → ORCID → data/publications.json
```

## Data Flow

1. **Author ID resolution** — one GET to resolve ORCID → OpenAlex author ID
   `GET https://api.openalex.org/authors?filter=orcid:0000-0002-2720-3364&mailto=rmata@gwdg.de`
   Returns author object; extract `id` field (e.g. `https://openalex.org/A2345678901`), strip URL prefix.
   Cached in `sessionStorage` as `pub_cache_v8_oalex_id`.

2. **Works fetch** — paginated fetch of all journal articles
   `GET https://api.openalex.org/works?filter=authorships.author.id:{id},type:journal-article&per_page=200&cursor=*&mailto=rmata@gwdg.de`
   Cursor-paginate until `meta.next_cursor` is null (safety; Prof. Mata has ~150 papers, under 200/page limit).
   Cached in `sessionStorage` as `pub_cache_v8_oalex`.

3. **DOI normalisation** — OpenAlex DOI field is a full URL (`https://doi.org/10.xxx/...`); strip prefix to get bare DOI.

4. **Filtering** — apply `REPO_PREFIXES` blocklist and deduplicate by DOI (same logic as ORCID path).

5. **Output shape** — `[{ doi, year, title }]` — identical to `fetchORCID()` output; handed to `enrichBatch()` unchanged.

## What Changes in `publications.js`

| Function | Change |
|---|---|
| `fetchOpenAlexAuthorId()` | New — resolves ORCID → OpenAlex author ID |
| `fetchOpenAlex()` | New — fetches + paginates works, normalises DOIs |
| `initPublications()` | Call `fetchOpenAlex()` first; `fetchORCID()` becomes second fallback |
| `CACHE_KEY` | Bumped to `pub_cache_v8` |
| Everything else | Unchanged |

## What Does Not Change

- `enrichOne()` / `enrichBatch()` — Crossref pipeline unchanged
- `renderEntry()` / `renderYear()` / `scaffoldContainer()` — rendering unchanged
- `fetchFallback()` — static JSON fallback unchanged
- `publications.html` — only the `?v=8` cache-bust query string updated

## Error Handling

- OpenAlex author ID lookup fails → log warning, fall through to ORCID
- OpenAlex works fetch fails → log warning, fall through to ORCID
- ORCID fails → fall through to static `data/publications.json`
- All fail → show error message (existing behaviour)
