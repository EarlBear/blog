#!/usr/bin/env python3
"""Map a company's public site before crawling it.

Pulls robots.txt and every sitemap it points at (following sitemap indexes),
then buckets the URLs into the sections that carry positioning. The bucket
counts alone are a finding: a site with 400 blog URLs and no use-case bucket is
running a different playbook from one with 30 solution pages.

Usage:
    python3 site_map.py apollo.io
    python3 site_map.py https://clay.com --top 40
    python3 site_map.py lemlist.com --bucket use-cases --top 100

Read-only, no dependencies beyond the standard library. Honors nothing but
politeness: one request per sitemap, a short timeout, a real user agent.
"""

import argparse
import gzip
import io
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict

UA = "Mozilla/5.0 (compatible; earlbear-competitor-analysis/1.0)"
TIMEOUT = 20
MAX_SITEMAPS = 60

# Ordered: first pattern that matches wins, so put the specific ones first.
BUCKETS = OrderedDict(
    [
        ("use-cases", r"/(use-?cases?|usecase)"),
        ("solutions", r"/(solutions?|for-|industries|persona)"),
        ("product", r"/(product|features?|platform|capabilit)"),
        ("pricing", r"/(pricing|plans?|cost)"),
        ("customers", r"/(customers?|case-?stud|success|testimonial)"),
        ("integrations", r"/(integrat|apps?/|marketplace|connectors?)"),
        ("docs", r"/(docs?|documentation|developers?|api|help|support|knowledge)"),
        ("blog", r"/(blog|resources?|guides?|articles?|academy|learn|glossary|templates?)"),
        ("about", r"/(about|team|company|careers?|jobs?|mission|story|press|news)"),
        ("legal", r"/(legal|privacy|terms|dpa|gdpr|security|compliance|sub-?processors?)"),
    ]
)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        raw = resp.read()
    if raw[:2] == b"\x1f\x8b" or url.endswith(".gz"):
        raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
    return raw.decode("utf-8", errors="replace")


def normalize(domain):
    if not domain.startswith(("http://", "https://")):
        domain = "https://" + domain
    parts = urllib.parse.urlsplit(domain)
    return f"{parts.scheme}://{parts.netloc}"


def sitemaps_from_robots(base):
    found, note = [], None
    try:
        body = fetch(base + "/robots.txt")
    except Exception as exc:  # noqa: BLE001 - a missing robots.txt is itself a finding
        return [], f"robots.txt unreachable ({exc})"
    for line in body.splitlines():
        if line.lower().startswith("sitemap:"):
            found.append(line.split(":", 1)[1].strip())
    if not found:
        note = "robots.txt names no sitemap"
    return found, note


def collect_urls(seeds):
    """Walk sitemaps (following <sitemapindex>) and return page URLs."""
    seen_maps, urls, errors = set(), [], []
    queue = list(seeds)
    while queue and len(seen_maps) < MAX_SITEMAPS:
        sm = queue.pop(0)
        if sm in seen_maps:
            continue
        seen_maps.add(sm)
        try:
            body = fetch(sm)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{sm} -> {exc}")
            continue
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", body)
        if "<sitemapindex" in body:
            queue.extend(locs)
        else:
            urls.extend(locs)
    return urls, sorted(seen_maps), errors


def bucket_of(url):
    path = urllib.parse.urlsplit(url).path.lower() or "/"
    if path in ("/", ""):
        return "product"
    for name, pattern in BUCKETS.items():
        if re.search(pattern, path):
            return name
    return "other"


def depth(url):
    return len([p for p in urllib.parse.urlsplit(url).path.split("/") if p])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("domain", help="company domain, e.g. apollo.io")
    ap.add_argument("--top", type=int, default=25, help="URLs to show per bucket (default 25)")
    ap.add_argument("--bucket", help="show only this bucket, in full depth order")
    args = ap.parse_args()

    base = normalize(args.domain)
    seeds, note = sitemaps_from_robots(base)
    if not seeds:
        seeds = [base + "/sitemap.xml", base + "/sitemap_index.xml"]

    urls, maps, errors = collect_urls(seeds)
    urls = sorted(set(urls))

    print(f"# site map: {base}")
    if note:
        print(f"# note: {note}")
    print(f"# sitemaps read: {len(maps)}   urls found: {len(urls)}")
    for err in errors[:5]:
        print(f"# error: {err}")
    if not urls:
        print("\n(no sitemap URLs — fall back to `site:` search enumeration and homepage nav)")
        return 1

    grouped = OrderedDict((name, []) for name in list(BUCKETS) + ["other"])
    for u in urls:
        grouped[bucket_of(u)].append(u)

    print("\n## bucket counts")
    for name, items in grouped.items():
        flag = "  <- MISSING (a finding)" if not items and name in ("use-cases", "pricing", "customers", "about") else ""
        print(f"{name:>13}: {len(items):>5}{flag}")

    names = [args.bucket] if args.bucket else list(grouped)
    for name in names:
        items = grouped.get(name)
        if items is None:
            print(f"\n(unknown bucket {name!r}; known: {', '.join(grouped)})", file=sys.stderr)
            return 2
        if not items:
            continue
        # Shallow URLs first — those are the positioning pages, not the long tail.
        items = sorted(items, key=lambda u: (depth(u), len(u), u))
        limit = len(items) if args.bucket else args.top
        print(f"\n## {name} ({len(items)})")
        for u in items[:limit]:
            print(f"  {u}")
        if len(items) > limit:
            print(f"  … {len(items) - limit} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
