#!/usr/bin/env python3
"""Guard the internal/external audience split — internal posts must never ship
to the public (external) site.

A post's audience is set in frontmatter: `audience: internal` marks a post for
the access-gated internal site (blog.internal.earlbear.com); anything else (the
default) is external and publishes to the public site (blog.earlbear.com). The
build target is chosen by PUBLIC_AUDIENCE and the actual filter lives in
src/lib/posts.ts (getPublishedPosts — an allowlist, fail-closed for external).

This hook is defense-in-depth around that filter. Four modes:

  1. Hook mode (stdin = PostToolUse JSON): if the edit touched a blog post,
     validate its `audience` value is exactly 'external' or 'internal'. A typo'd
     value blocks (exit 2) so it is fixed before it can silently drop a post.

  2. `--check` (CLI): validate every post's `audience` value. Exit 0 / 1.
     Wired as `npm run` is not needed; `--check-dist` is the deploy gate below.

  3. `--check-dist <dir> [--audience external|internal]`: THE TEETH. After a
     build, scan the produced output (dir, default audience 'external') and FAIL
     (exit 1) if any post from the OTHER audience leaked in — matched by slug,
     title, and the `audience:` marker across HTML, rss.xml, and sitemaps. This
     inspects real output, so it catches a filter regression, a mis-set env var,
     or a stray artifact — not merely source intent. Called by the deploy scripts
     before publishing, so a leak aborts the deploy.

  4. `--assert-target external|internal`: verify the PUBLIC_AUDIENCE env var
     matches the intended deploy target before publishing (exit 0 / 1). Stops a
     wrong-target invocation (e.g. deploying an internal build to gh-pages).

The zod enum in src/content.config.ts remains the authoritative schema gate;
this hook fails faster and, crucially, checks the built artifact.
"""
import json
import os
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")
VALID_AUDIENCES = ("external", "internal")


def parse_frontmatter(text: str):
    """Minimal YAML-subset frontmatter parse (same shape as check-posts.py).
    Returns (dict | None, error | None)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, "missing frontmatter (file must start with ---)"
    fm, key = {}, None
    for i, line in enumerate(lines[1:], 2):
        if line.strip() == "---":
            return fm, None
        if re.match(r"^\s+-\s", line):
            if key is None:
                return None, f"line {i}: list item with no key"
            fm.setdefault(key, [])
            if isinstance(fm[key], list):
                fm[key].append(line.split("-", 1)[1].strip().strip("'\""))
            continue
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if val == "":
            fm[key] = []
        elif val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            fm[key] = [v.strip().strip("'\"") for v in inner.split(",")] if inner else []
        else:
            fm[key] = val.strip().strip("'\"")
    return None, "frontmatter never closed (no trailing ---)"


def post_audience(fm: dict) -> str:
    """The declared audience, defaulting to 'external' when absent (matches the
    zod default in src/content.config.ts)."""
    a = fm.get("audience")
    return a if isinstance(a, str) and a else "external"


def load_posts(root: Path):
    """Yield (path, slug, fm) for every post. slug = filename stem = URL slug."""
    d = root / POSTS_DIR
    if not d.is_dir():
        return
    for p in sorted(d.iterdir()):
        if p.suffix not in (".md", ".mdx"):
            continue
        text = p.read_text(encoding="utf-8", errors="ignore")
        fm, err = parse_frontmatter(text)
        yield p, p.stem, (fm if fm is not None else {}), err


# ── mode 1 + 2: validate frontmatter audience values ─────────────────────────

def validate_audiences(root: Path, targets):
    errs = []
    for p in targets:
        rel = p.relative_to(root)
        text = p.read_text(encoding="utf-8", errors="ignore")
        fm, perr = parse_frontmatter(text)
        if perr:
            errs.append(f"{rel}: {perr}")
            continue
        a = fm.get("audience")
        if a is None:
            # REQUIRED — no silent default. A missing audience must never fall
            # through to 'external' and ship to the public site by accident.
            errs.append(
                f"{rel}: missing required frontmatter field 'audience'. Set "
                "'audience: external' (publishes to the public blog.earlbear.com) "
                "or 'audience: internal' (internal-only, access-gated). This must "
                "be an explicit decision — there is no default."
            )
        elif a not in VALID_AUDIENCES:
            errs.append(
                f"{rel}: audience must be 'external' or 'internal' (got {a!r})."
            )
    return errs


# ── mode 3: scan the built dist for cross-audience leakage ───────────────────

def scan_dist(root: Path, dist_dir: Path, build_audience: str):
    """Fail if the built output contains any post NOT belonging to build_audience.

    build_audience is what this dist was built for ('external' | 'internal').
    We collect the OTHER audience's posts from source and assert none of their
    slugs / titles / the `audience:` marker appear anywhere in the output.
    """
    other = "internal" if build_audience == "external" else "external"
    forbidden_slugs, forbidden_titles = [], []
    for _p, slug, fm, _err in load_posts(root):
        if post_audience(fm) == other:
            forbidden_slugs.append(slug)
            title = fm.get("title")
            if isinstance(title, str) and title.strip():
                forbidden_titles.append(title.strip())

    if not dist_dir.is_dir():
        return [f"{dist_dir}: build output not found — run the build first"]

    # Gather searchable text from the artifact: every HTML page, the RSS feed,
    # and the sitemaps (where a leaked URL would also surface).
    haystack_files = []
    for pat in ("**/*.html", "**/*.xml"):
        haystack_files.extend(dist_dir.glob(pat))

    hits = []

    # 1. A directory named after a forbidden slug means its page was emitted.
    for slug in forbidden_slugs:
        page = dist_dir / "blog" / slug
        if page.exists() or (dist_dir / "blog" / f"{slug}.html").exists():
            hits.append(
                f"{other} post '{slug}' has a rendered page in {dist_dir}/blog/ "
                f"— it must NOT appear on the {build_audience} site"
            )

    # 2. Slug/title/marker text anywhere in HTML or feeds.
    blob = "\n".join(
        f.read_text(encoding="utf-8", errors="ignore") for f in haystack_files
    )
    for slug in forbidden_slugs:
        if re.search(rf"/blog/{re.escape(slug)}/", blob):
            hits.append(
                f"{other} post '{slug}' is linked in the {build_audience} "
                "output (HTML/RSS/sitemap)"
            )
    for title in forbidden_titles:
        if title and title in blob:
            hits.append(
                f"{other} post title {title!r} appears in the {build_audience} output"
            )
    # 3. The raw marker should never survive into an external build.
    if build_audience == "external" and re.search(r"audience['\"]?\s*:\s*internal", blob):
        hits.append("the literal marker `audience: internal` appears in the external output")

    # 4. Standalone INTERNAL-only pages (not blog posts, so not covered by the
    #    post allowlist above). These are self-guarded to 404 on the external
    #    build (e.g. src/pages/repo-map.astro checks isInternalBuild), but this is
    #    the belt-and-suspenders dist check that survives a guard refactor: on the
    #    external build, neither a rendered page directory nor a sitemap/HTML link
    #    for the route may exist. Add a route here whenever a new internal-only
    #    standalone page ships. See docs/features/audience-split.md.
    INTERNAL_ONLY_ROUTES = ["repo-map"]
    if build_audience == "external":
        for route in INTERNAL_ONLY_ROUTES:
            page = dist_dir / route / "index.html"
            if page.exists() or (dist_dir / f"{route}.html").exists():
                hits.append(
                    f"internal-only page '/{route}/' has a rendered page in "
                    f"{dist_dir} — it must NOT appear on the external site"
                )
            if re.search(rf"/{re.escape(route)}/", blob):
                hits.append(
                    f"internal-only route '/{route}/' is linked in the external "
                    "output (HTML/sitemap) — it must not leak publicly"
                )

    # 5. The comment layer is INTERNAL-ONLY (CF Access gated + RLS enforced). Its client
    #    script is guarded by `import.meta.env.PUBLIC_AUDIENCE === 'internal'` (tree-shaken
    #    out of the external bundle) and its styles are `<style is:inline>` (emitted only when
    #    the component renders). This is the belt-and-suspenders dist check: the EXTERNAL build
    #    must ship NO comment markup, NO comment JS/CSS, and NO Supabase client. A leak here
    #    would put a DB-write path + auth surface on the public site. See docs/comments-design.md.
    if build_audience == "external":
        # Scan HTML + the JS/CSS asset bundles (not just HTML — the leak was a bundled chunk).
        asset_files = list(dist_dir.glob("**/*.js")) + list(dist_dir.glob("**/*.css"))
        asset_blob = "\n".join(
            f.read_text(encoding="utf-8", errors="ignore") for f in asset_files
        )
        combined = blob + "\n" + asset_blob
        COMMENT_MARKERS = [
            "data-comment-layer",   # the layer's root markup
            "cl-composer",          # a comment-UI class
            "cl-marker",
            "blog_comments",         # the table name (only the comment client references it)
            "@supabase/supabase-js", # the supabase client (comments are its only blog user)
        ]
        for marker in COMMENT_MARKERS:
            if marker in combined:
                hits.append(
                    f"the internal-only comment layer leaked into the external build "
                    f"(found {marker!r} in dist) — it must never ship to the public site"
                )

    # De-dupe while preserving order.
    seen, uniq = set(), []
    for h in hits:
        if h not in seen:
            seen.add(h)
            uniq.append(h)
    return uniq


# ── mode 4: assert the env target ────────────────────────────────────────────

def assert_target(expected: str):
    actual = os.environ.get("PUBLIC_AUDIENCE")
    if expected == "external":
        # external is the default: unset or 'external' is fine; 'internal' is not.
        if actual in (None, "", "external"):
            return []
        return [
            f"PUBLIC_AUDIENCE={actual!r} but this deploy target is EXTERNAL "
            "(blog.earlbear.com). Refusing to publish an internal build to the "
            "public site. Unset PUBLIC_AUDIENCE or set it to 'external'."
        ]
    if expected == "internal":
        if actual == "internal":
            return []
        return [
            f"PUBLIC_AUDIENCE={actual!r} but this deploy target is INTERNAL. Set "
            "PUBLIC_AUDIENCE=internal (the deploy:internal script does this)."
        ]
    return [f"unknown assert-target {expected!r}"]


# ── entrypoint ───────────────────────────────────────────────────────────────

def touched_post(payload, root: Path):
    ti = payload.get("tool_input", {}) or {}
    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    if not fp:
        return None
    p = Path(fp)
    try:
        rel = p.relative_to(root)
    except ValueError:
        rel = p
    if str(rel.parent).replace("\\", "/") == str(POSTS_DIR) and rel.suffix in (".md", ".mdx"):
        return p if p.is_absolute() else root / rel
    return None


def main() -> int:
    root = Path.cwd()
    args = sys.argv[1:]

    # mode 4: --assert-target <external|internal>
    if "--assert-target" in args:
        i = args.index("--assert-target")
        expected = args[i + 1] if i + 1 < len(args) else ""
        errs = assert_target(expected)
        if errs:
            print("BLOCKED: audience deploy-target mismatch:", file=sys.stderr)
            for e in errs:
                print("  " + e, file=sys.stderr)
            return 1
        return 0

    # mode 3: --check-dist <dir> [--audience external|internal]
    if "--check-dist" in args:
        i = args.index("--check-dist")
        dist_dir = Path(args[i + 1]) if i + 1 < len(args) else Path("dist")
        build_audience = "external"
        if "--audience" in args:
            j = args.index("--audience")
            build_audience = args[j + 1] if j + 1 < len(args) else "external"
        if build_audience not in VALID_AUDIENCES:
            print(f"--audience must be one of {VALID_AUDIENCES} (got {build_audience!r})",
                  file=sys.stderr)
            return 1
        hits = scan_dist(root, dist_dir, build_audience)
        if hits:
            print(f"BLOCKED: cross-audience leak in the {build_audience} build "
                  f"({dist_dir}) — aborting before publish:", file=sys.stderr)
            for h in hits:
                print("  " + h, file=sys.stderr)
            print("The audience filter in src/lib/posts.ts should have excluded these. "
                  "Do not deploy until this is clean.", file=sys.stderr)
            return 1
        print(f"audience OK — {dist_dir} contains no cross-audience content "
              f"(target: {build_audience}).")
        return 0

    # mode 2: --check (validate all posts' audience values)
    if "--check" in args:
        targets = sorted(
            p for p in (root / POSTS_DIR).iterdir() if p.suffix in (".md", ".mdx")
        )
        errs = validate_audiences(root, targets)
        if errs:
            print("Audience validation failed:", file=sys.stderr)
            for e in errs:
                print("  " + e, file=sys.stderr)
            return 1
        print(f"audience OK — {len(targets)} post(s) have a valid audience value.")
        return 0

    # mode 1: hook (stdin PostToolUse JSON)
    raw = sys.stdin.read()
    if not raw.strip():
        return 0
    try:
        payload = json.loads(raw)
    except Exception:
        return 0
    if not (isinstance(payload, dict) and "tool_name" in payload):
        return 0
    post = touched_post(payload, root)
    if post is None or not post.exists():
        return 0
    errs = validate_audiences(root, [post])
    if errs:
        print("BLOCKED: invalid audience value after this edit —", file=sys.stderr)
        for e in errs:
            print("  " + e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
