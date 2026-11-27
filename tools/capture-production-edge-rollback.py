#!/usr/bin/env python3
"""Read-only local capture of both deployed production Edge function trees.
Run with an authenticated Supabase CLI. No deploy, upload, secret read or DB write.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

PROJECT = "nyjwigipamnvpdvpauuv"

def cli(cwd, *args):
    return subprocess.run(["supabase", *args], cwd=cwd, check=True,
                          stdout=subprocess.PIPE, text=True).stdout

def target(help_text):
    if "--remote" in help_text:
        return ["--remote=" + PROJECT]
    if "--project-ref" in help_text:
        return ["--project-ref", PROJECT]
    raise RuntimeError("CLI lacks explicit project selection")

def snapshot(cwd, flags, expected):
    raw = json.loads(cli(cwd, "functions", "list", *flags, "-o", "json"))
    rows = raw if isinstance(raw, list) else raw["functions"]
    selected = [r for r in rows if r.get("slug") in expected]
    if len(selected) != 2 or {r["slug"] for r in selected} != set(expected):
        raise RuntimeError("Expected exactly gameplay and coop")
    for row in selected:
        if (str(row.get("version")) != expected[row["slug"]]
                or row.get("status") != "ACTIVE" or row.get("verify_jwt") is not False):
            raise RuntimeError("Live version or auth configuration changed: " + row["slug"])
    return sorted(selected, key=lambda row: row["slug"])

def capture(expected):
    os.umask(0o077)
    home = Path.home().resolve()
    # Do not place deployed source inside any checkout or CI artifact workspace.
    if os.environ.get("CI") or any((p / ".git").exists() for p in (home, *home.parents)):
        raise RuntimeError("Run locally with a home directory outside Git")
    with tempfile.TemporaryDirectory(prefix="veldryn-edge-work-", dir=home) as tmp:
        work = Path(tmp)
        version = cli(work, "--version").strip()
        cli(work, "init")
        list_flags = target(cli(work, "functions", "list", "--help"))
        download_help = cli(work, "functions", "download", "--help")
        download_flags = target(download_help)
        if "--use-api" not in download_help:
            raise RuntimeError("CLI does not support API download")
        before = snapshot(work, list_flags, expected)
        for slug in expected:
            cli(work, "functions", "download", slug, *download_flags, "--use-api")
        after = snapshot(work, list_flags, expected)
        if before != after:
            raise RuntimeError("Deployment metadata changed during capture")
        source = work / "supabase" / "functions"
        for slug in expected:
            if not (source / slug / "index.ts").is_file() or not (source / slug / "index.ts").stat().st_size:
                raise RuntimeError("Missing or empty entrypoint: " + slug)
        files = sorted(source.rglob("*"))
        if any(p.is_symlink() for p in files):
            raise RuntimeError("Unexpected symlink in downloaded source")
        import shutil
        out = Path(tempfile.mkdtemp(prefix="veldryn-edge-rollback-", dir=home))
        try:
            shutil.copytree(source, out / "functions")
            (out / "metadata.json").write_text(json.dumps({
                "project": PROJECT, "cli_version": version, "before": before, "after": after,
            }, indent=2) + "\n", encoding="utf-8")
            paths = sorted(p for p in out.rglob("*") if p.is_file())
            manifest = "".join(hashlib.sha256(p.read_bytes()).hexdigest() + "  "
                               + p.relative_to(out).as_posix() + "\n" for p in paths)
            (out / "SHA256SUMS").write_text(manifest, encoding="utf-8")
            for p in paths:
                if hashlib.sha256(p.read_bytes()).hexdigest() != next(
                    line.split("  ", 1)[0] for line in manifest.splitlines()
                    if line.split("  ", 1)[1] == p.relative_to(out).as_posix()
                ):
                    raise RuntimeError("Checksum readback mismatch")
        except Exception:
            shutil.rmtree(out)
            raise
        return out

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gameplay-version", required=True, type=int)
    parser.add_argument("--coop-version", required=True, type=int)
    args = parser.parse_args()
    if min(args.gameplay_version, args.coop_version) < 1:
        parser.error("Expected positive deployed versions")
    result = capture({"gameplay": str(args.gameplay_version), "coop": str(args.coop_version)})
    print("Private local capture:", result)
    print("Inspect both source trees, dependencies and authentication configuration before approving deployment. Do not upload to public GitHub.")
