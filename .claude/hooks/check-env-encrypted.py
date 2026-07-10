#!/usr/bin/env python3
"""Guard the dotenvx invariant: no plaintext secret in a committed .env* file.

gitleaks catches *secret-shaped* values (AWS keys, PEM blocks, long tokens) but NOT a
plaintext config value that doesn't match a signature — e.g. `PUBLIC_SUPABASE_URL=https://…`
or a reworded var. This check enforces the STRUCTURAL rule instead: every value in a
git-tracked (or staged) `.env*` file must be either

  • dotenvx ciphertext            NAME="encrypted:BASE64…"
  • the dotenvx public key         DOTENV_PUBLIC_KEY="…"   (safe by design — it's public)
  • an empty placeholder           NAME=            (a template line, e.g. in .env.example)

Anything else is a plaintext value sitting in a committed file → fail. The raw `.env` and
`.env.keys` are gitignored, so in practice this polices `.env.example` and anything a
`git add -f` tries to sneak in.

Modes (mirrors check-task-files.py):
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched a .env* file, re-check the
     tracked/staged .env* set; exit 2 with an explanation on violation so it gets fixed.
  2. CLI mode (--check / no stdin): check + report, exit 0 clean / 1 on violation. Used by
     `make check` and the pre-commit hook.

Pre-commit usage: `python3 .claude/hooks/check-env-encrypted.py --staged` checks only the
files staged for commit (so it blocks the actual commit, not unrelated working-tree state).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

# A .env* file we police. Not .env.example's siblings only — any dotenv file.
ENV_GLOB_RE = re.compile(r"(^|/)\.env(\.[^/]+)?$")
# A KEY=VALUE line (dotenv). Captures the raw value (may be quoted).
KV_RE = re.compile(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
# Keys whose value is public by design (safe to store plaintext).
PUBLIC_KEYS = {"DOTENV_PUBLIC_KEY"}


def _unquote(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def _is_ok_value(key: str, raw: str) -> bool:
    val = _unquote(raw)
    if val == "":
        return True  # empty placeholder — a template line
    if key in PUBLIC_KEYS:
        return True  # dotenvx public key is meant to be public
    if val.startswith("encrypted:"):
        return True  # dotenvx ciphertext
    return False  # a plaintext value in a committed .env* → not allowed


def _tracked_env_files(root: Path) -> list[str]:
    try:
        out = subprocess.run(
            ["git", "ls-files"], cwd=root, capture_output=True, text=True, check=True
        ).stdout
    except Exception:
        return []
    return [p for p in out.splitlines() if ENV_GLOB_RE.search(p)]


def _staged_env_files(root: Path) -> list[str]:
    try:
        out = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=root, capture_output=True, text=True, check=True,
        ).stdout
    except Exception:
        return []
    return [p for p in out.splitlines() if ENV_GLOB_RE.search(p)]


def violations(root: Path, files: list[str]) -> list[str]:
    errs: list[str] = []
    for rel in files:
        f = root / rel
        if not f.exists():
            continue
        for i, line in enumerate(
            f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1
        ):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            m = KV_RE.match(line)
            if not m:
                continue
            key, raw = m.group(1), m.group(2)
            if not _is_ok_value(key, raw):
                errs.append(
                    f"{rel}:{i}: PLAINTEXT value for {key} in a committed .env* — "
                    f"run `make encrypt` (or blank it if this is a template)."
                )
    return errs


def _root() -> Path:
    try:
        top = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return Path(top)
    except Exception:
        return Path.cwd()


def main() -> int:
    args = set(sys.argv[1:])
    root = _root()

    # --staged: only the files staged for this commit (pre-commit hook).
    if "--staged" in args:
        files = _staged_env_files(root)
        errs = violations(root, files)
        if errs:
            sys.stderr.write("Plaintext secret in a staged .env* file — commit blocked:\n")
            sys.stderr.write("\n".join("  " + e for e in errs) + "\n")
            return 1
        return 0

    # --check / CLI: the whole tracked set (make check).
    if "--check" in args or sys.stdin.isatty():
        files = _tracked_env_files(root)
        errs = violations(root, files)
        if errs:
            print("check-env-encrypted: FAIL")
            print("\n".join("  " + e for e in errs))
            return 1
        n = len(files)
        print(f"check-env-encrypted: OK ({n} tracked .env* file{'s' if n != 1 else ''}, all encrypted/blank)")
        return 0

    # Hook mode: PostToolUse JSON on stdin. Only act if a .env* was touched.
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    tool_input = payload.get("tool_input", {}) or {}
    touched = str(tool_input.get("file_path", "") or "")
    if not ENV_GLOB_RE.search(touched.replace("\\", "/")):
        return 0
    files = _tracked_env_files(root)
    errs = violations(root, files)
    if errs:
        sys.stderr.write(
            "A committed .env* file has a PLAINTEXT value. dotenvx keeps values as "
            "`encrypted:` ciphertext; template files keep them blank.\n"
        )
        sys.stderr.write("\n".join("  " + e for e in errs) + "\n")
        sys.stderr.write("Fix: `make encrypt` (real values) or blank the placeholder.\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
