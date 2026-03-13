#!/usr/bin/env python3
"""
Download TOC (graphical abstract) images for all publications.

Writes images to images/tocs/ and a manifest to data/tocs.json.
The manifest maps DOI -> filename so publications.js can find local images.

Strategy
--------
Only fetch from publishers known to expose the graphical abstract reliably
via the og:image meta tag.  All other publishers are skipped to avoid
downloading unrelated article figures.

Trusted publishers (DOI prefix → strategy):
  10.1039/  Royal Society of Chemistry  — og:image IS the graphical abstract
  10.3762/  Beilstein Journals          — og:image IS the graphical abstract

Skipped publishers (og:image is NOT the graphical abstract):
  10.1038/  Nature Portfolio    — og:image is a random article figure
  10.1021/  ACS Publications   — graphical abstract behind authentication
  10.1002/  Wiley              — inconsistent og:image usage
  10.1007/  Springer           — og:image is first-page PDF rendering
  10.3897/  Pensoft / RIO      — og:image is a journal logo or icon

Validation rules applied to every downloaded image:
  • Aspect ratio: skip if height > 1.3 × width (portrait → not a TOC)
  • Minimum dimensions: skip if width < 100 px or height < 50 px
  • Maximum dimensions: skip if width > 1500 px or height > 1500 px
  • Minimum file size: skip if < 5 KB (icon / placeholder)
  • Content type: skip if text/html (login page / error page)

Usage (from repo root):
    python3 scripts/fetch-tocs.py

Dependencies:
    pip install requests Pillow

Re-runnable: already-downloaded images are skipped.
"""

import io
import json
import os
import re
import time

import requests
from PIL import Image

# ── Config ────────────────────────────────────────────────────────────────────

ORCID_ID   = '0000-0002-2720-3364'
MAILTO     = 'rmata@gwdg.de'
OUTPUT_DIR = 'images/tocs'
MANIFEST   = 'data/tocs.json'

# Publishers whose og:image reliably contains the graphical abstract.
# Keys are DOI prefixes; values describe the evidence for trustworthiness.
TRUSTED_PREFIXES = {
    '10.1039/': 'RSC — og:image is graphical abstract (small GIF, ~189 px tall)',
    '10.3762/': 'Beilstein — og:image is graphical abstract (landscape PNG)',
}

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

# Validation thresholds
MIN_WIDTH_PX   = 100
MIN_HEIGHT_PX  = 50
MAX_WIDTH_PX   = 1500
MAX_HEIGHT_PX  = 1500
MAX_PORTRAIT_RATIO = 1.3   # skip if height / width > this
MIN_FILE_BYTES = 5 * 1024  # 5 KB

# Target display width for saved images (2× the CSS display width for Retina)
RESIZE_WIDTH = 200

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


def is_trusted(doi):
    """Return (True, description) if this DOI's publisher is in the allowlist."""
    for prefix, desc in TRUSTED_PREFIXES.items():
        if doi.startswith(prefix):
            return True, desc
    return False, None


def get_og_image(doi):
    """
    Resolve DOI to publisher landing page and extract og:image URL.
    Only called for trusted publishers.
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

        # Try both attribute orderings of og:image
        for pat in (
            r'<meta\s[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']',
            r'<meta\s[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']',
        ):
            m = re.search(pat, html, re.I)
            if m:
                url = m.group(1).strip()
                # Skip obvious non-TOC images
                if re.search(r'logo|favicon|icon|banner|placeholder|cover', url, re.I):
                    continue
                return url

    except Exception:
        pass
    return None


def validate_and_resize(content):
    """
    Validate image content against TOC criteria.
    Returns (PIL.Image, ext) on success, or (None, None) on rejection.
    Resizes to RESIZE_WIDTH px wide (preserving aspect ratio).
    """
    try:
        img = Image.open(io.BytesIO(content))
        w, h = img.size

        # Dimension bounds
        if w < MIN_WIDTH_PX or h < MIN_HEIGHT_PX:
            return None, None
        if w > MAX_WIDTH_PX or h > MAX_HEIGHT_PX:
            return None, None

        # Aspect ratio: TOC figures are landscape or square
        if h > w * MAX_PORTRAIT_RATIO:
            return None, None

        # Resize to target width
        if w > RESIZE_WIDTH:
            new_h = round(h * RESIZE_WIDTH / w)
            img = img.resize((RESIZE_WIDTH, new_h), Image.LANCZOS)

        # Determine output format
        fmt = img.format or 'PNG'
        ext_map = {'JPEG': '.jpg', 'PNG': '.png', 'GIF': '.gif', 'WEBP': '.webp'}
        ext = ext_map.get(fmt, '.png')

        return img, ext

    except Exception:
        return None, None


def doi_to_stem(doi):
    """Convert a DOI to a safe filename stem (no extension)."""
    return re.sub(r'[^a-z0-9._-]', '_', doi.lower())


def download_image(url, doi):
    """
    Download url, validate it as a TOC image, resize, and save to OUTPUT_DIR.
    Returns filename on success, or None.
    """
    try:
        r = requests.get(url, headers=HEADERS, timeout=20, allow_redirects=True)
        if not r.ok or not r.content:
            return None

        # Reject HTML responses (login pages, error pages)
        ct = r.headers.get('content-type', '').split(';')[0].strip()
        if 'html' in ct or 'text' in ct:
            return None

        # Reject tiny files (icons, placeholders)
        if len(r.content) < MIN_FILE_BYTES:
            return None

        img, ext = validate_and_resize(r.content)
        if img is None:
            return None

        filename = doi_to_stem(doi) + ext
        out_path = os.path.join(OUTPUT_DIR, filename)

        # Save (convert palette/RGBA GIFs to RGBA PNG if needed)
        save_fmt = ext.lstrip('.').upper()
        if save_fmt == 'JPG':
            save_fmt = 'JPEG'
        if save_fmt == 'GIF':
            # Preserve GIF as-is by writing raw bytes
            with open(out_path, 'wb') as f:
                f.write(r.content)
            # But re-save as PNG if image was resized
            orig_w = Image.open(io.BytesIO(r.content)).size[0]
            if orig_w > RESIZE_WIDTH:
                filename = doi_to_stem(doi) + '.png'
                out_path = os.path.join(OUTPUT_DIR, filename)
                img.save(out_path, 'PNG')
        else:
            if img.mode in ('RGBA', 'P') and save_fmt == 'JPEG':
                img = img.convert('RGB')
            img.save(out_path, save_fmt)

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

    trusted_dois = [(doi, desc) for doi in dois
                    for ok, desc in [is_trusted(doi)] if ok]
    skipped_untrusted = len(dois) - len(trusted_dois)

    print(f'Trusted publishers: {len(trusted_dois)} DOIs')
    print(f'Skipped (untrusted publisher): {skipped_untrusted} DOIs\n')

    found = skipped = missing = rejected = 0

    for i, (doi, pub_desc) in enumerate(trusted_dois, 1):
        existing = manifest.get(doi)
        if existing and os.path.exists(os.path.join(OUTPUT_DIR, existing)):
            skipped += 1
            continue

        print(f'[{i}/{len(trusted_dois)}] {doi}', end='  ', flush=True)

        url = get_og_image(doi)
        if not url:
            missing += 1
            print('NO og:image')
            time.sleep(1)
            continue

        filename = download_image(url, doi)
        if filename:
            manifest[doi] = filename
            found += 1
            print(f'OK → {filename}')
        else:
            rejected += 1
            print(f'REJECTED  ({url[:60]}…)')

        time.sleep(1)   # polite: 1 req/s to publisher sites

    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    print(f'\nDone: {found} downloaded, {skipped} already present, '
          f'{missing} no image found, {rejected} rejected by validation.')
    print(f'Manifest written to {MANIFEST}.')


if __name__ == '__main__':
    main()
