#!/usr/bin/env python3
"""The blog's two site addresses agree everywhere they are written.

The public site's address lives in three places, and a rename that changes one and misses
another breaks the site without any build failing:

  1. `public/CNAME`, which tells GitHub Pages which custom domain to serve;
  2. `astro.config.mjs`, which writes the address into every canonical link, the RSS feed
     and the sitemap;
  3. the domain repo's `domains.yaml`, which holds the DNS row that points the address at
     GitHub Pages.

The internal site has the same three-way agreement: its address in `astro.config.mjs`, its
row in `domains.yaml`, and the Cloudflare Pages project that row points at, which must be
the project `deploy:internal` uploads to (`package.json`) and the Makefile's
`CF_INTERNAL_PROJECT`.

This check never names an address itself. It only asks the places to agree, so a rename
passes once every place moves together, and fails, naming the place, while one lags.

The domain repo is a neighbouring folder. When it is missing, the check skips, unless
EB_REQUIRE_SIBLINGS=1 (which `make check` sets), where a missing neighbour fails.
Its folder name can be changed with EB_DOMAIN_REPO.

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

import yaml

ROOT = Path(__file__).resolve().parent.parent
DOMAIN_REPO = os.environ.get("EB_DOMAIN_REPO", "earlbear-domain")
STRICT = os.environ.get("EB_REQUIRE_SIBLINGS") == "1"

HOST = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$")
# const site = AUDIENCE === 'internal' ? '<internal>' : '<external>';
SITE = re.compile(
    r"AUDIENCE\s*===\s*['\"]internal['\"]\s*\?\s*['\"]https://([^'\"/]+)/?['\"]\s*:\s*['\"]https://([^'\"/]+)/?['\"]"
)


def workspace() -> Path:
    """The folder that holds the main checkouts, found from git so it works in a worktree too."""
    out = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "--path-format=absolute", "--git-common-dir"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return Path(out).parent.parent


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def blog_side(errors: list[str]) -> dict:
    """What this repo says: the two hosts and the internal Pages project."""
    cname = [l.strip() for l in read("public/CNAME").splitlines() if l.strip()]
    if len(cname) != 1 or not HOST.match(cname[0]):
        errors.append(f"public/CNAME must hold exactly one bare host name, found {cname!r}")
    m = SITE.search(read("astro.config.mjs"))
    if not m:
        errors.append(
            "astro.config.mjs: could not find the `AUDIENCE === 'internal' ? '<internal>' : "
            "'<external>'` site choice; update this check if it moved"
        )
        internal = external = None
    else:
        internal, external = m.group(1).lower(), m.group(2).lower()
    cname_host = cname[0].lower() if cname else None
    if external and cname_host and external != cname_host:
        errors.append(
            f"astro.config.mjs builds the public site for {external}, but public/CNAME "
            f"serves {cname_host}: canonical links and the sitemap would point at the wrong host"
        )
    if internal and external and internal == external:
        errors.append(f"astro.config.mjs uses {internal} for both the internal and public site")

    pkg = json.loads(read("package.json"))
    deploy = pkg.get("scripts", {}).get("deploy:internal", "")
    pm = re.search(r"--project-name\s+(\S+)", deploy)
    project = pm.group(1) if pm else None
    if not project:
        errors.append("package.json: deploy:internal has no --project-name")
    mk = re.search(r"^CF_INTERNAL_PROJECT\s*:?=\s*(\S+)", read("Makefile"), re.M)
    if not mk:
        errors.append("Makefile: CF_INTERNAL_PROJECT is missing")
    elif project and mk.group(1) != project:
        errors.append(
            f"Makefile CF_INTERNAL_PROJECT is {mk.group(1)}, but deploy:internal uploads to "
            f"{project}: the comment secrets would land on a project that is not served"
        )
    return {"external": cname_host or external, "internal": internal, "project": project}


def domain_rows(domains_yaml: Path) -> dict[str, dict]:
    """Every host the domain repo declares, by its full name."""
    cfg = yaml.safe_load(domains_yaml.read_text(encoding="utf-8")) or {}
    rows: dict[str, dict] = {}
    for zone, z in (cfg.get("zones") or {}).items():
        for r in (z or {}).get("records") or []:
            name = r.get("name")
            fqdn = zone if name == "@" else f"{name}.{zone}"
            rows.setdefault(fqdn.lower(), r)
    return rows


def domain_side(blog: dict, rows: dict[str, dict], where: str, errors: list[str]) -> None:
    ext, inn, project = blog["external"], blog["internal"], blog["project"]
    if ext:
        r = rows.get(ext)
        if not r:
            errors.append(f"{where} has no row for the public site {ext}")
        else:
            if r.get("class") != "github-pages":
                errors.append(f"{where}: {ext} is class {r.get('class')!r}, not github-pages")
            if (r.get("deploy") or {}).get("cmd") != "make deploy":
                errors.append(f"{where}: {ext} must deploy with this repo's `make deploy`")
    if inn:
        r = rows.get(inn)
        if not r:
            errors.append(f"{where} has no row for the internal site {inn}")
        else:
            if r.get("class") != "cf-pages":
                errors.append(f"{where}: {inn} is class {r.get('class')!r}, not cf-pages")
            if project and r.get("content") != f"{project}.pages.dev":
                errors.append(
                    f"{where}: {inn} points at {r.get('content')}, but deploy:internal uploads "
                    f"to {project}: the internal site would serve an old or empty project"
                )
            if (r.get("deploy") or {}).get("cmd") != "make deploy-internal":
                errors.append(f"{where}: {inn} must deploy with this repo's `make deploy-internal`")


def main() -> int:
    errors: list[str] = []
    blog = blog_side(errors)

    domains_yaml = workspace() / DOMAIN_REPO / "domains.yaml"
    if domains_yaml.is_file():
        domain_side(blog, domain_rows(domains_yaml), f"{DOMAIN_REPO}/domains.yaml", errors)
        compared = True
    else:
        compared = False
        msg = f"the neighbouring {DOMAIN_REPO} folder (or its domains.yaml) is missing at {domains_yaml}"
        if STRICT:
            errors.append(f"{msg}; EB_REQUIRE_SIBLINGS=1 needs it")
        else:
            print(f"  site-address-check: SKIPPED the DNS side: {msg}")

    if errors:
        print("FAIL: the blog's site addresses disagree:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1
    side = f", and {DOMAIN_REPO}/domains.yaml agrees" if compared else ""
    print(
        f"  site-address-check: public {blog['external']}, internal {blog['internal']} "
        f"(Pages project {blog['project']}){side}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
