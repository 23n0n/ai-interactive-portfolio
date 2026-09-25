#!/usr/bin/env python3
"""Check the distribution's own internal consistency.

Run from anywhere:  python3 scripts/check-docs.py

The distribution is prose, so its failures are silent: a cross-reference to a
file that moved, a split that drifted from its source, a migration line number
that shifted under an edit, a planning artifact that leaked back into the tree.
This script turns each of those into a failing check. Standard library only; it
reads files and (when available) the git index — it never writes.

Exit codes: 0 all checks pass, 1 findings, 2 usage/environment error.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths a reader may open. Anything whose first segment is one of these is a
# distribution file and must exist; everything else is site-scope (created by
# the build in the owner's own repository) and is deliberately not checked.
DISTRIBUTION_ROOTS = {
    "AGENTS.md", "README.md", "DATABASE_SCHEMA.md", "GUIDE_FROM_SCRATCH.md",
    "GUIDE_FROM_SCRATCH.pdf", "SKILL_INTERACTIVE_PORTFOLIO.md", "LICENSE",
    "sanitize-id.lua", "references", "scripts", "skills", "examples",
}

# `scripts/` holds two different things. The helpers and the checker below ship
# in this repository; the CI and deploy scripts are *specified* here and written
# in the site's own repository, so their names are deliberately absent from this
# tree. Anything else under `scripts/` still has to exist.
SITE_SCRIPTS = {
    "audit-rls.mjs", "patch-wrangler.mjs", "smoke-test-live.mjs", "verify-public-parity.mjs",
    "verify-cors-live.mjs", "verify-built-worker.mjs", "deploy-edge-functions.sh",
}

# Development-node artifacts: planning documents, internal task ids, private
# logs and files a reader cannot open, and pending markers that belong in a
# ticket rather than a shipped document.
DEV_NODE_MARKERS = [
    ("PLAN_AI_DISTRIBUTION", "planning artifact referenced"),
    ("INCIDENT-2026", "private incident file named"),
    ("AGENT_BOARD", "private workspace log named"),
    ("task `fm-", "internal task id"),
    ("captain-approved", "internal approval chatter"),
    ("not yet built", "pending/TODO marker"),
    ("task spec", "internal spec jargon"),
    ("the P2 owner", "plan-phase jargon"),
    ("/Volumes/", "author machine path"),
    ("~/.omp", "author tooling path"),
]

findings: list[str] = []
notes: list[str] = []


def read(rel: str) -> str:
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


def markdown_files() -> list[str]:
    out = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "dist"}]
        for name in files:
            if name.endswith(".md"):
                out.append(os.path.relpath(os.path.join(base, name), ROOT))
    return sorted(out)


PRIVATE_COMMIT_ID = re.compile(r"\b(commit|shipped|reverted|prod)\s*`[0-9a-f]{7,}`")


def check_dev_node_markers(files: list[str]) -> None:
    for rel in files:
        body = read(rel)
        for marker, why in DEV_NODE_MARKERS:
            if marker in body:
                findings.append(f"{rel}: dev-node artifact [{why}]: {marker!r}")
        for hit in PRIVATE_COMMIT_ID.findall(body):
            findings.append(f"{rel}: commit id from a repository the reader cannot open: {hit!r}")


def check_appendix_identity() -> None:
    """The guide's Appendix A must stay byte-identical to the skill body."""
    skill = read("SKILL_INTERACTIVE_PORTFOLIO.md")
    if "# Interactive Portfolio Builder" not in skill:
        findings.append("SKILL_INTERACTIVE_PORTFOLIO.md: skill heading not found")
        return
    skill_body = "# Interactive Portfolio Builder" + skill.split("# Interactive Portfolio Builder", 1)[1]

    guide = read("GUIDE_FROM_SCRATCH.md")
    marker = "## Appendix A — The interactive-portfolio skill (full text)"
    if marker not in guide:
        findings.append("GUIDE_FROM_SCRATCH.md: Appendix A heading not found")
        return
    lines = guide.split(marker, 1)[1].split("\n")
    fence = next((i for i, l in enumerate(lines) if l.startswith("`````")), None)
    if fence is None:
        findings.append("GUIDE_FROM_SCRATCH.md: Appendix A opening fence not found")
        return
    inner = lines[fence + 1:]
    while inner and inner[-1].strip() == "":
        inner.pop()
    if not inner or not inner[-1].startswith("````"):
        findings.append("GUIDE_FROM_SCRATCH.md: Appendix A closing fence not found")
        return
    if "\n".join(inner[:-1]).rstrip() != skill_body.rstrip():
        findings.append("GUIDE_FROM_SCRATCH.md: Appendix A has drifted from SKILL_INTERACTIVE_PORTFOLIO.md")
    else:
        notes.append(f"appendix identity: identical ({len(inner) - 1} lines)")


def check_declared_relocations() -> None:
    """The declared source-line numbers for the schema split must be real."""
    src = read("DATABASE_SCHEMA.md").split("\n")

    def one(pred, label):
        hits = [i + 1 for i, line in enumerate(src) if pred(line)]
        if len(hits) != 1:
            findings.append(f"DATABASE_SCHEMA.md: {label} matched {len(hits)} lines, expected 1")
            return None
        return hits[0]

    r1a = one(lambda l: l.startswith("`spotlight`, `experience`"), "R1 first line")
    r1b = one(lambda l: l == "`disclaimer`, `footer`, `fun`.", "R1 last line")
    r2a = one(lambda l: l.startswith("live in the migrations (New Year"), "R2 first line")
    r2b = one(lambda l: l.endswith("— adapt dates to your persona."), "R2 last line")
    p1 = one(lambda l: l.endswith("Seed rows (adapt wording):"), "R1 pointer line")
    p2 = one(lambda l: l.endswith("Trigger: `set_updated_at`. Seed rows"), "R2 pointer line")
    ca = one(lambda l: l.startswith("Reference files in the source project:"), "closing paragraph")
    if None in (r1a, r1b, r2a, r2b, p1, p2, ca):
        return
    notes.append(f"relocations: R1 {r1a}-{r1b} (ptr {p1}), R2 {r2a}-{r2b} (ptr {p2}), closing {ca}-{ca + 3}")

    declared = {
        "references/schema/README.md": [f"| R1 | {r1a}–{r1b} |", f"| R2 | {r2a}–{r2b} |",
                                        f"at line {p1}", f"at line {p2}", f"lines {ca}–{ca + 3}"],
        "references/schema/seeds.md": [f"lines {r1a}–{r1b}", f"lines {r2a}–{r2b}", f"lines {ca}–{ca + 3}"],
        "references/schema/content.md": [f"lines {r1a}–{r1b}", f"lines {r2a}–{r2b}"],
    }
    for rel, needles in declared.items():
        body = read(rel)
        for needle in needles:
            if needle not in body:
                findings.append(f"{rel}: relocation declaration out of date, missing {needle!r}")


def check_referenced_paths(files: list[str]) -> None:
    """Every backticked distribution path must exist."""
    pattern = re.compile(r"`((?:[A-Za-z0-9._-]+/)*[A-Za-z0-9._-]+)`")
    seen: set[str] = set()
    for rel in files:
        for candidate in pattern.findall(read(rel)):
            if candidate in seen or "/" not in candidate and candidate not in DISTRIBUTION_ROOTS:
                continue
            first = candidate.split("/")[0]
            if first not in DISTRIBUTION_ROOTS or "<" in candidate or "*" in candidate:
                continue
            if candidate.endswith("/"):
                continue
            if first == "scripts" and candidate.split("/")[-1] in SITE_SCRIPTS:
                continue
            seen.add(candidate)
            if not os.path.exists(os.path.join(ROOT, candidate)):
                findings.append(f"{rel}: references `{candidate}`, which does not exist in this tree")


def check_tracked_paths() -> None:
    """No sync-duplicate or author-side paths may be tracked."""
    try:
        out = subprocess.run(["git", "-C", ROOT, "ls-files"], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        notes.append("tracked paths: skipped (git unavailable)")
        return
    if out.returncode != 0:
        notes.append("tracked paths: skipped (not a git work tree)")
        return
    tracked = [p for p in out.stdout.split("\n") if p]
    dupes = [p for p in tracked if re.search(r" \d", p)]
    if dupes:
        findings.append(f"tracked sync-duplicate paths: {dupes[:3]}")
    else:
        notes.append(f"tracked files: {len(tracked)} — none look like sync duplicates")


def check_refs() -> None:
    """Refs stay readable: a file-sync tool that duplicates files duplicates refs too."""
    try:
        out = subprocess.run(["git", "-C", ROOT, "for-each-ref", "--format=%(refname)"],
                             capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        notes.append("refs: skipped (git unavailable)")
        return
    if out.returncode != 0:
        notes.append("refs: skipped (not a git work tree)")
        return
    refs = [line for line in out.stdout.split("\n") if line]
    odd = [ref for ref in refs if re.search(r" \d+$", ref)]
    if odd:
        findings.append(f"duplicate-looking refs: {odd[:3]}")
    if "broken name" in out.stderr:
        findings.append("a ref has a broken name: git ignores it, and `git fetch` fails on it")
    heads = os.path.join(ROOT, ".git", "refs", "heads")
    if os.path.isdir(heads):
        for name in sorted(os.listdir(heads)):
            if f"refs/heads/{name}" not in refs:
                findings.append(f"junk ref file (git cannot read it): .git/refs/heads/{name}")
    if not odd and "broken name" not in out.stderr:
        notes.append(f"refs: {len(refs)} readable")


def check_split_coverage() -> None:
    """Every schema identifier the source names must appear in the split too."""
    source = read("DATABASE_SCHEMA.md")
    ids = set(re.findall(r"`((?:public|private)\.[A-Za-z0-9_]+)", source))
    split_dir = os.path.join(ROOT, "references", "schema")
    if not os.path.isdir(split_dir):
        findings.append("references/schema/ is missing")
        return
    split = "\n".join(read(f"references/schema/{name}") for name in sorted(os.listdir(split_dir))
                      if name.endswith(".md"))
    missing = sorted(i for i in ids if i not in split)
    if missing:
        findings.append(f"schema identifiers absent from the per-domain split: {missing[:5]}")
    else:
        notes.append(f"split coverage: {len(ids)} schema identifiers all present")


# Claims this repository has deliberately superseded. A paragraph may still
# mention them only while saying that they are gone — otherwise the old wording
# has crept back and the two files now disagree. Matching ignores line-wrap
# whitespace, because several of these were hidden for a release by a wrap
# (`http(s)\n    only`, `all 21\n  tables`).
SUPERSEDED_CLAIMS = [
    ("no MFA for the single-operator admin", "ithdrawn", "the MFA acceptance was withdrawn"),
    ("signups restricted", None, "public signup is disabled now"),
    ("signups are restricted", None, "public signup is disabled now"),
    ("http(s) only", None, "images are https-only now"),
    ("skip with warning", None, "a skipped function now fails the release"),
    ("skip that function", None, "a skipped function now fails the release"),
    ("21 tables", None, "the schema has 22 tables now"),
    ("foreign-domain signup\n  rejected", None, "signup is disabled now"),
    ("preload", "max-age", "preload now requires a longer max-age"),
    # MFA: the provider docs settle it — Supabase's Basic (TOTP) MFA is included on
    # the free plan, so the admin login must carry it. Both older framings are wrong.
    ("no MFA for the single-operator admin", None, "the admin login carries TOTP MFA — it is not a single-operator exemption"),
    ("no MFA for the single operator", None, "the admin login carries TOTP MFA — it is not a single-operator exemption"),
    ("no MFA on the single-operator admin", None, "the admin login carries TOTP MFA — it is not a single-operator exemption"),
    ("MFA on Supabase is a paid feature", None, "Supabase's Basic (TOTP) MFA is included on the free plan; only phone MFA is paid"),
    ("Supabase's MFA is a paid", None, "Supabase's Basic (TOTP) MFA is included on the free plan; only phone MFA is paid"),
    ("MFA is available only in Paid", None, "TOTP MFA is included on the free plan; only phone MFA is paid"),
    ("Cloudflare Access in front of", None, "the free second factor is Supabase TOTP, which the provider docs confirm is included"),
    ("Cloudflare Access (free", None, "do not assert a Cloudflare plan limit that the docs do not state"),
    ("Supabase-hosted admin login", "TOTP", "the Supabase admin login must be described with its TOTP control"),
    # The 2026-09 hardening revision retired these; each is a claim a reader would
    # build to, and each now contradicts a reference.
    ("14-day retention", None,
     "backups run daily/weekly/monthly tiers, not a single 14-day window"),
    ("One Supabase project serves both targets", None,
     "production and staging are separate Supabase projects"),
    ("one Supabase project is shared", None,
     "production and staging are separate Supabase projects"),
    ("shared by both worker environments", None,
     "production and staging are separate Supabase projects"),
    ("no function-level staging", None,
     "the function set is promoted through the staging project first"),
    ("no function-level rollback", None,
     "rollback.yml re-deploys the previous release's function set in one dispatch"),
    ("every accepted method", None,
     "the CV challenge is verified on the POST only; GET/HEAD carry the signed download token"),
    ("stays for React inline styles", None,
     "style-src 'unsafe-inline' stays only while React inline styles need it"),
    ("only for React inline styles", None,
     "style-src 'unsafe-inline' stays only while React inline styles need it"),
    ("provider-side spend cap", None,
     "the provider documents no console-level cap; the prepaid balance is the hard stop (ADR-0014)"),
    ("http(s) hosts", None, "images are https-only now"),
    # The 2026-09 mirror closure retired the reactive-only deploy-token story:
    # a paragraph may describe a refresh-on-failure only while it also states
    # the schedule. (The old kit's four-case review brief is not guarded here,
    # because `references/secure.md` §6 keeps that quoted brief on purpose and
    # appends the extension to the eight-case matrix.)
    ("deploys start failing with auth errors", "schedule",
     "the deploy-token rotation is scheduled as well as reactive (`references/operate.md` §6)"),
]


def sentences(text: str) -> list[str]:
    """Paragraphs, so a rule is not broken by a line wrap."""
    return [p for p in re.split(r"\n\s*\n", text) if p.strip()]


def flatten(text: str) -> str:
    """Paragraph text with line-wrap whitespace collapsed, so a wrap cannot hide a claim."""
    return re.sub(r"\s+", " ", text)


def check_superseded_claims(files: list[str]) -> None:
    for rel in files:
        for para in sentences(read(rel)):
            flat = flatten(para)
            for phrase, must_also, why in SUPERSEDED_CLAIMS:
                if flatten(phrase) not in flat:
                    continue
                if must_also is not None and flatten(must_also) not in flat:
                    findings.append(f"{rel}: superseded wording {phrase!r} without the correction — {why}")
                if must_also is None:
                    findings.append(f"{rel}: superseded wording {phrase!r} — {why}")


def heading_numbers(rel: str) -> set[str]:
    """Section numbers a document actually has (`4`, `4.1`, `12`, `2.3`)."""
    numbers = set()
    for line in read(rel).split("\n"):
        m = re.match(r"^#{2,4}\s+(?:\*\*)?(?:Stage\s+|Phase\s+)?(\d+(?:\.\d+)*)", line)
        if m:
            numbers.add(m.group(1))
    return numbers


def section_items(rel: str) -> dict[str, int]:
    """For each numbered section, the highest ordered-list item inside it."""
    highest: dict[str, int] = {}
    current: str | None = None
    for line in read(rel).split("\n"):
        head = re.match(r"^#{2,4}\s+(?:\*\*)?(?:Stage\s+|Phase\s+)?(\d+(?:\.\d+)*)", line)
        if head:
            current = head.group(1)
            highest.setdefault(current, 0)
            continue
        item = re.match(r"^(\d+)\.\s", line)
        if current is not None and item:
            highest[current] = max(highest[current], int(item.group(1)))
    return highest


def check_citations(files: list[str]) -> None:
    """`<file>.md` §N must point at a section that file really has."""
    cache: dict[str, set[str]] = {}
    item_counts: dict[str, dict[str, int]] = {}
    citation = re.compile(r"`([A-Za-z0-9_./-]+\.md)`\s*§(\d+(?:\.\d+)*)")
    for rel in files:
        for target, section in citation.findall(read(rel)):
            if target not in cache:
                if not os.path.exists(os.path.join(ROOT, target)):
                    continue  # a missing file is reported by check_referenced_paths
                cache[target] = heading_numbers(target)
            known = cache[target]
            if section in known or any(k.startswith(section + ".") for k in known):
                continue
            # `§N.M` is also how these docs cite the Mth numbered item of section N.
            if "." in section:
                base, item = section.split(".", 1)
                if base in known:
                    if target not in item_counts:
                        item_counts[target] = section_items(target)
                    if item_counts[target].get(base, 0) >= int(item):
                        continue
            findings.append(f"{rel}: cites `{target}` §{section}, which that file does not have")


def check_text_hygiene(files: list[str]) -> None:
    """Tables stay balanced, no tabs, no trailing whitespace."""
    for rel in files:
        for n, line in enumerate(read(rel).split("\n"), 1):
            if "\t" in line:
                findings.append(f"{rel}:{n}: tab character")
            if line != line.rstrip():
                findings.append(f"{rel}:{n}: trailing whitespace")
            if line.startswith("|") and not line.rstrip().endswith("|"):
                findings.append(f"{rel}:{n}: table row not closed")


def main() -> int:
    if not os.path.isdir(os.path.join(ROOT, "references")):
        print(f"check-docs: {ROOT} does not look like the distribution root", file=sys.stderr)
        return 2

    files = markdown_files()
    check_dev_node_markers(files)
    check_appendix_identity()
    check_declared_relocations()
    check_referenced_paths(files)
    check_tracked_paths()
    check_refs()
    check_split_coverage()
    check_superseded_claims(files)
    check_citations(files)
    check_text_hygiene(files)

    for note in notes:
        print(f"  {note}")
    print(f"check-docs: {len(files)} markdown files checked, {len(findings)} finding(s)")
    for finding in findings:
        print(f"  ! {finding}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
