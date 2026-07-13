#!/usr/bin/env python3
"""Thin launcher shim for the docs/features/ why-doc anchor engine.

The anchor ENGINE that used to live here (features_lib.py + this file's logic)
was consolidated into the **decision-tracking-manager** marketplace plugin
(one source of truth across EarlBear repos). This repo keeps only this shim so
that `npm run features:check` / `make features-check` and the feature-docs skill
keep working unchanged.

Why a shim instead of calling the plugin directly:
  A plugin's CLI lives at a VERSION-SPECIFIC, garbage-collected cache path
  (~/.claude/plugins/cache/<marketplace>/<plugin>/<VERSION>/hooks/...). That path
  is unstable — it changes on every plugin update and is GC'd ~7 days after — so
  package.json / Makefile must NOT hardcode it. This shim discovers the NEWEST
  installed plugin cache dir at runtime and execs its reconcile-anchors.py.

Flag mapping (preserves this repo's original CLI contract):
  (no flag)  → plugin --check   # report drift, exit 1 on unreviewed drift (CI gate)
  --seed     → plugin --seed     # write hashes for uncached anchors, self-heal moves
  --quiet    → plugin --quiet

Config: the plugin reads docs/features locations + owner/repo from this repo's
  .claude/hooks/decision-tracking.conf (ENABLE=1, OWNER=EarlBear, REPO=blog,
  ANCHORS_DIR=docs/features). If the plugin isn't installed, this shim prints how
  to install it and exits non-zero (so CI surfaces the setup gap, not a false pass).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

MARKETPLACE = "earlbear-claude-plugins"
PLUGIN = "decision-tracking-manager"
CLI = "reconcile-anchors.py"

REPO_ROOT = Path(__file__).resolve().parent.parent


def find_plugin_cli() -> Path | None:
    """Discover the newest installed cache dir for the plugin and return its CLI.

    Cache layout: ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/hooks/<CLI>
    Versions sort naturally; pick the highest that actually contains the CLI."""
    base = Path.home() / ".claude" / "plugins" / "cache" / MARKETPLACE / PLUGIN
    if not base.is_dir():
        return None

    def version_key(p: Path):
        parts = []
        for chunk in p.name.split("."):
            parts.append(int(chunk) if chunk.isdigit() else -1)
        return parts

    candidates = sorted(
        (d for d in base.iterdir() if d.is_dir()), key=version_key, reverse=True
    )
    for d in candidates:
        cli = d / "hooks" / CLI
        if cli.is_file():
            return cli
    return None


def main(argv: list[str]) -> int:
    cli = find_plugin_cli()
    if cli is None:
        sys.stderr.write(
            f"✘ {PLUGIN} plugin not installed — the docs/features anchor engine now\n"
            f"  ships in that plugin. Install it, then re-run:\n"
            f"    claude plugin install {PLUGIN}@{MARKETPLACE} --scope user\n"
            f"  (it is auto-installed for this repo via .claude/settings.json's\n"
            f"   check-plugins.sh on the next Claude session.)\n"
        )
        return 3

    # Map this repo's flags to the plugin CLI's flags.
    plugin_args: list[str] = []
    if "--seed" in argv:
        plugin_args.append("--seed")
    else:
        plugin_args.append("--check")  # default sweep = the exit-1-on-drift CI gate
    if "--quiet" in argv:
        plugin_args.append("--quiet")

    # The plugin resolves the repo + config from CLAUDE_PROJECT_DIR.
    env = dict(os.environ)
    env.setdefault("CLAUDE_PROJECT_DIR", str(REPO_ROOT))

    return subprocess.call([sys.executable, str(cli), *plugin_args], env=env)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
