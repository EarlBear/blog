#!/usr/bin/env python3
"""The blog's two site addresses agree everywhere they are written.

The public site's address lives in three places, and a rename that changes one and misses
another breaks the site without any build failing:

  1. `public/CNAME`, which tells GitHub Pages which custom domain to serve;
  2. `astro.config.mjs`, which writes the address into every canonical link, the RSS feed
     and the sitemap;
  3. the domain repo's `domains.yaml`, which holds the DNS row that points the address at
     GitHub Pages. That row must point at the GitHub owner this repo's `origin` lives under
     (`<owner>.github.io`), and deploy from this repo's folder.

The internal site has the same three-way agreement: its address in `astro.config.mjs`, its
row in `domains.yaml`, and the Cloudflare Pages project that row points at, which must be
the project `deploy:internal` uploads to (`package.json`) and the Makefile's
`CF_INTERNAL_PROJECT`.

This check never names an address itself. It only asks the places to agree, so a rename
passes once every place moves together, and fails, naming the place, while one lags.

The domain repo is a neighbouring folder, read at a fixed branch so the result does not
depend on what that folder has checked out:

  EB_DOMAIN_REPO  the neighbour's folder name (default `earlbear-domain`);
  EB_DOMAIN_REF   the branch or commit to read `domains.yaml` from (default `main`), or `.`
                  for the file on disk. To check a pair of rename PRs together, point both at
                  the domain PR: EB_DOMAIN_REPO=<its worktree> EB_DOMAIN_REF=. (or its branch).

When the neighbour (or that branch, or PyYAML) is missing, the check skips the DNS side,
unless EB_REQUIRE_SIBLINGS=1 (which `make check` sets), where it fails.

Rebrand step 1.5, test 13 (.claude/plans/rebrand-sudorev-repos.md in command-center).

Exit 0 = they agree (or the neighbour is missing and not required), 1 = they don't.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOMAIN_REPO = os.environ.get("EB_DOMAIN_REPO", "earlbear-domain")
DOMAIN_REF = os.environ.get("EB_DOMAIN_REF", "main")
STRICT = os.environ.get("EB_REQUIRE_SIBLINGS") == "1"

HOST = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$")
# const site = AUDIENCE === 'internal' ? '<internal>' : '<external>';
SITE = re.compile(
    r"AUDIENCE\s*===\s*['\"]internal['\"]\s*\?\s*['\"]https://([^'\"/]+)/?['\"]\s*:\s*['\"]https://([^'\"/]+)/?['\"]"
)
# git@github.com:Owner/repo.git, https://github.com/Owner/repo(.git), ssh://git@github.com/Owner/repo
GITHUB_OWNER = re.compile(r"github\.com[:/]+([^/]+)/")


class Missing(Exception):
    """The domain side cannot be read; skipped, or a failure under EB_REQUIRE_SIBLINGS=1."""


def git(*args: str) -> str:
    out = subprocess.run(["git", *args], capture_output=True, text=True)
    if out.returncode != 0:
        raise Missing(out.stderr.strip() or f"git {' '.join(args)} failed")
    return out.stdout


def main_checkout() -> Path:
    """This repo's main checkout (not a worktree), found from git. Its parent holds the neighbours."""
    try:
        common = git("-C", str(ROOT), "rev-parse", "--path-format=absolute", "--git-common-dir").strip()
    except (Missing, OSError) as e:
        raise Missing(f"could not ask git where this checkout lives: {e}") from None
    return Path(common).parent


def read(rel: str, errors: list[str]) -> str:
    try:
        return (ROOT / rel).read_text(encoding="utf-8")
    except FileNotFoundError:
        errors.append(f"{rel} is missing")
        return ""


def github_owner() -> str | None:
    try:
        url = git("-C", str(ROOT), "remote", "get-url", "origin").strip()
    except (Missing, OSError):
        return None
    m = GITHUB_OWNER.search(url)
    return m.group(1).lower() if m else None


def blog_side(errors: list[str]) -> dict:
    """What this repo says: the two hosts and the internal Pages project."""
    cname = [l.strip().lower() for l in read("public/CNAME", errors).splitlines() if l.strip()]
    if len(cname) != 1 or not HOST.match(cname[0]):
        errors.append(f"public/CNAME must hold exactly one bare host name, found {cname!r}")
    m = SITE.search(read("astro.config.mjs", errors))
    if not m:
        errors.append(
            "astro.config.mjs: could not find the `AUDIENCE === 'internal' ? '<internal>' : "
            "'<external>'` site choice; update this check if it moved"
        )
        internal = external = None
    else:
        internal, external = m.group(1).lower(), m.group(2).lower()
    cname_host = cname[0] if len(cname) == 1 else None
    if external and cname_host and external != cname_host:
        errors.append(
            f"astro.config.mjs builds the public site for {external}, but public/CNAME "
            f"serves {cname_host}: canonical links and the sitemap would point at the wrong host"
        )
    if internal and external and internal == external:
        errors.append(f"astro.config.mjs uses {internal} for both the internal and public site")

    try:
        pkg = json.loads(read("package.json", errors) or "{}")
    except json.JSONDecodeError as e:
        errors.append(f"package.json is not valid JSON: {e}")
        pkg = {}
    deploy = pkg.get("scripts", {}).get("deploy:internal", "")
    pm = re.search(r"--project-name(?:=|\s+)(\S+)", deploy)
    project = pm.group(1) if pm else None
    if not project:
        errors.append("package.json: deploy:internal has no --project-name")
    mk = re.search(r"^CF_INTERNAL_PROJECT\s*[:?]?=\s*(\S+)", read("Makefile", errors), re.M)
    if not mk:
        errors.append("Makefile: CF_INTERNAL_PROJECT is missing")
    elif project and mk.group(1) != project:
        errors.append(
            f"Makefile CF_INTERNAL_PROJECT is {mk.group(1)}, but deploy:internal uploads to "
            f"{project}: the comment secrets would land on a project that is not served"
        )
    return {"external": cname_host or external, "internal": internal, "project": project}


def fqdn(name: str, zone: str) -> str:
    """Same rule as the domain repo's scripts/lib/zones.py fqdn()."""
    return zone if name in ("@", "", zone) else f"{name}.{zone}"


def load_domains(domain_dir: Path) -> tuple[dict, str]:
    """domains.yaml from the neighbour at EB_DOMAIN_REF, and a label saying where it came from."""
    try:
        import yaml
    except ImportError:
        raise Missing("PyYAML is not installed for this python3 (pip3 install pyyaml)") from None
    if not domain_dir.is_dir():
        raise Missing(f"the neighbouring {DOMAIN_REPO} folder is missing at {domain_dir}")
    if DOMAIN_REF == ".":
        path = domain_dir / "domains.yaml"
        if not path.is_file():
            raise Missing(f"{path} is missing")
        text, where = path.read_text(encoding="utf-8"), f"{DOMAIN_REPO}/domains.yaml (on disk)"
    else:
        try:
            text = git("-C", str(domain_dir), "show", f"{DOMAIN_REF}:domains.yaml")
        except (Missing, OSError) as e:
            raise Missing(f"could not read domains.yaml at {DOMAIN_REF} in {DOMAIN_REPO}: {e}") from None
        where = f"{DOMAIN_REPO}/domains.yaml at {DOMAIN_REF}"
    return yaml.safe_load(text) or {}, where


def domain_rows(cfg: dict) -> dict[str, list[dict]]:
    """Every row the domain repo declares, by the host's full name."""
    rows: dict[str, list[dict]] = {}
    for zone, z in (cfg.get("zones") or {}).items():
        for r in (z or {}).get("records") or []:
            rows.setdefault(fqdn(str(r.get("name", "")), zone).lower(), []).append(r)
    return rows


def one_row(rows: dict[str, list[dict]], host: str, label: str, where: str, errors: list[str]) -> dict | None:
    found = rows.get(host) or []
    if not found:
        errors.append(f"{where} has no row for the {label} site {host}")
        return None
    if len(found) > 1:
        # Both hosts are CNAMEs, and DNS allows no other record beside a CNAME.
        errors.append(f"{where} has {len(found)} rows for the {label} site {host}; one CNAME is expected")
        return None
    return found[0]


def check_deploy(r: dict, host: str, cmd: str, repo_dir: str, where: str, errors: list[str]) -> None:
    d = r.get("deploy") or {}
    if d.get("cmd") != cmd:
        errors.append(f"{where}: {host} must deploy with this repo's `{cmd}`")
    if Path(str(d.get("repo", ""))).name != repo_dir:
        errors.append(
            f"{where}: {host} deploys from {d.get('repo')!r}, but this repo's folder is {repo_dir}"
        )


def domain_side(blog: dict, rows: dict[str, list[dict]], repo_dir: str, where: str, errors: list[str]) -> None:
    ext, inn, project = blog["external"], blog["internal"], blog["project"]
    if ext and (r := one_row(rows, ext, "public", where, errors)):
        if r.get("class") != "github-pages":
            errors.append(f"{where}: {ext} is class {r.get('class')!r}, not github-pages")
        owner = github_owner()
        if owner and str(r.get("content", "")).lower() != f"{owner}.github.io":
            errors.append(
                f"{where}: {ext} points at {r.get('content')}, but this repo's origin is under "
                f"{owner}: GitHub Pages serves it from {owner}.github.io"
            )
        check_deploy(r, ext, "make deploy", repo_dir, where, errors)
    if inn and (r := one_row(rows, inn, "internal", where, errors)):
        if r.get("class") != "cf-pages":
            errors.append(f"{where}: {inn} is class {r.get('class')!r}, not cf-pages")
        if project and r.get("content") != f"{project}.pages.dev":
            errors.append(
                f"{where}: {inn} points at {r.get('content')}, but deploy:internal uploads "
                f"to {project}: the internal site would serve an old or empty project"
            )
        check_deploy(r, inn, "make deploy-internal", repo_dir, where, errors)


def main() -> int:
    errors: list[str] = []
    blog = blog_side(errors)

    compared = None
    try:
        checkout = main_checkout()
        cfg, where = load_domains(checkout.parent / DOMAIN_REPO)
        domain_side(blog, domain_rows(cfg), checkout.name, where, errors)
        compared = where
    except Missing as e:
        if STRICT:
            errors.append(f"{e}; EB_REQUIRE_SIBLINGS=1 needs the domain side")
        else:
            print(f"  site-address-check: SKIPPED the DNS side: {e}")

    if errors:
        print("FAIL: the blog's site addresses disagree:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1
    side = f", and {compared} agrees" if compared else ""
    print(
        f"  site-address-check: public {blog['external']}, internal {blog['internal']} "
        f"(Pages project {blog['project']}){side}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
