#!/usr/bin/env python3
"""
Download TOC (graphical abstract) images for all publications.

Writes images to images/tocs/ and a manifest to data/tocs.json.
The manifest maps DOI -> filename so publications.js can find local images.

Strategy: resolve each DOI to the publisher landing page and extract the
og:image meta tag, which most publishers use for their TOC/graphical abstract.

Usage (from repo root):
    python3 scripts/fetch-tocs.py

Re-runnable: already-downloaded images are skipped.
"""

import json
import os
import re
import time

import requests

# ── Config ────────────────────────────────────────────────────────────────────

ORCID_ID   = '0000-0002-2720-3364'
MAILTO     = 'rmata@gwdg.de'
OUTPUT_DIR = 'images/tocs'
MANIFEST   = 'data/tocs.json'

REPO_PREFIXES = ('10.3204/', '10.25625/', '10.17877/', '10.5281/')

DOI_BLOCKLIST = {
    '10.31080/asop.2023.06.0639',
    '10.2478/srj-2025-0001',
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_dois():
    """Fetch all article DOIs from OpenAlex."""
    api_headers = {'User-Agent': f'cchembio-website/1.0 (mailto:{MAILTO})'}
    r = requests.get(
        f'https://api.openalex.org/authors?filter=orcid:{ORCID_ID}&mailto={MAILTO}',
        headers=api_headers, timeout=15,
    )
    r.raise_for_status()
    author_id = r.json()['results'][0]['id'].replace('https://openalex.org/', '')

    dois = []
    cursor = '*'
    while cursor:
        url = (
            f'https://api.openalex.org/works'
            f'?filter=authorships.author.id:{author_id},type:article'
            f'&per_page=200&cursor={cursor}&mailto={MAILTO}'
        )
        r = requests.get(url, headers=api_headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        for w in data.get('results', []):
            raw = (w.get('doi') or '').strip()
            doi = re.sub(r'^https?://doi\.org/', '', raw, flags=re.I).lower().strip()
            if not doi:
                continue
            if any(doi.startswith(p) for p in REPO_PREFIXES):
                continue
            if doi in DOI_BLOCKLIST:
                continue
            dois.append(doi)
        cursor = data.get('meta', {}).get('next_cursor')
    return dois


def get_og_image(doi):
    """
    Resolve DOI to publisher landing page and extract og:image URL.
    Returns an image URL or None.
    """
    try:
        r = requests.get(
            f'https://doi.org/{doi}',
            headers=HEADERS,
            timeout=20,
            allow_redirects=True,
        )
        if not r.ok:
            return None

        html = r.text

        # og:image (standard Open Graph — used by ACS, RSC, Wiley, Springer, Nature…)
        # Try both attribute orderings
        for pat in (
            r'<meta\s[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']',
            r'<meta\s[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']',
        ):
            m = re.search(pat, html, re.I)
            if m:
                url = m.group(1).strip()
                # Skip generic publisher logos / favicons
                if re.search(r'logo|favicon|icon|banner|placeholder', url, re.I):
                    continue
                return url

    except Exception:
        pass
    return None


def doi_to_stem(doi):
    """Convert a DOI to a safe filename stem (no extension)."""
    return re.sub(r'[^a-z0-9._-]', '_', doi.lower())


def download_image(url, doi):
    """Download url and save to OUTPUT_DIR. Returns filename or None."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=20, allow_redirects=True)
        if not r.ok or not r.content:
            return None

        # Reject HTML responses (login pages, error pages, etc.)
        ct = r.headers.get('content-type', '').split(';')[0].strip()
        if 'html' in ct or 'text' in ct:
            return None

        ext_map = {
            'image/jpeg': '.jpg', 'image/png': '.png',
            'image/gif': '.gif',  'image/webp': '.webp',
        }
        ext = ext_map.get(ct)
        if not ext:
            m = re.search(r'\.(jpe?g|png|gif|webp)', url, re.I)
            ext = ('.' + m.group(1).lower()) if m else '.jpg'
        ext = ext.replace('.jpeg', '.jpg')

        # Sanity check: file should be at least 1 KB
        if len(r.content) < 1024:
            return None

        filename = doi_to_stem(doi) + ext
        with open(os.path.join(OUTPUT_DIR, filename), 'wb') as f:
            f.write(r.content)
        return filename
    except Exception:
        return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as f:
            manifest = json.load(f)

    print('Fetching DOIs from OpenAlex…')
    dois = get_dois()
    print(f'Found {len(dois)} DOIs.\n')

    found = skipped = missing = 0

    for i, doi in enumerate(dois, 1):
        existing = manifest.get(doi)
        if existing and os.path.exists(os.path.join(OUTPUT_DIR, existing)):
            skipped += 1
            continue

        print(f'[{i}/{len(dois)}] {doi}', end='  ', flush=True)

        url = get_og_image(doi)
        if not url:
            missing += 1
            print('NONE')
            time.sleep(1)
            continue

        filename = download_image(url, doi)
        if filename:
            manifest[doi] = filename
            found += 1
            print(f'OK → {filename}')
        else:
            missing += 1
            print(f'FAIL  ({url[:60]}…)')

        time.sleep(1)   # polite: 1 req/s to publisher sites

    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    print(f'\nDone: {found} downloaded, {skipped} already present, {missing} not found.')
    print(f'Manifest written to {MANIFEST}.')


if __name__ == '__main__':
    main()
