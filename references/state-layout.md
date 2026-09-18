# references/state-layout.md — durable state formats

Everything below lives on disk under the owner's ai-distribution home (`ad-home/`). Restart = read
these files; chat is never authoritative for site state. Reconciliation happens by reading disk,
not by trusting the previous conversation.

## ad-home/ layout

```
ad-home/
  state/.lock/                         # one active agent session guard (dir-lock)
    owner                              # type-tagged token: pid:<n> | session:<id>
    acquired                           # ISO-8601 UTC, written when the lock is acquired
  state/sites.json                     # durable registry: one row per site
  data/<site-id>/manifest.md           # identity, stack decisions, accounts, URLs
  data/<site-id>/decisions.log         # append-only why-choices; the design contract
  data/<site-id>/runs/<run-id>/report.md  # per-change record (build / deploy / audit)
```

The unit of work is a **site** (long-lived, many changes over months), not a task. A change to a
site is a **run**. The distro repository itself is never written to.

`<site-id>` is a short, stable, lowercase slug (`zbw`, `portfolio`, `jane-co`). It never changes
after registration; the domain may.

**No secret values in any `ad-home/` file.** Keys, tokens, passwords and connection strings never
appear in the registry, the manifest, the decisions log or a run report — only the fact that a
secret exists and where it lives. There is no exception for "temporary" evidence.

## state/sites.json

```json
{
  "sites": [
    {
      "id": "zbw",
      "owner": "Piotr Żabrowski",
      "domain": "zabrowski.pl",
      "plan": "paid",
      "repo": "git@github.com:owner/zabrowski-pl.git",
      "status": "live",
      "created": "2026-09-18T15:00:00Z",
      "updated": "2026-09-18T17:20:00Z"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `id` | Stable site slug; the directory name under `data/` |
| `owner` | Name of the person whose site this is (the approving party) |
| `domain` | Primary public domain; `""` until one is chosen |
| `plan` | Cost posture: `free` = free tiers only, `paid` = any paid service, plan or domain |
| `repo` | Where the site's source lives (URL or local path) |
| `status` | Lifecycle value (below) |
| `created` | ISO-8601 UTC, set at registration, never edited |
| `updated` | ISO-8601 UTC, bumped on every registry or status change |

### Status values and lifecycle

`registered` → `designing` → `building` → `staging` → `live`

Side states: `paused` (owner stopped work; resume from `manifest.md`), `failed` (a run ended without
recovery; the reason is in the latest run report), `archived` (site is retired; history kept, no
further runs).

Rules:

- Stage mapping: Intake → `registered`, Design approved → `designing`, Build → `building`, staging
  deploy → `staging`, go-live → `live`.
- `registered` means the row exists and the manifest may be empty. Nothing else may happen before
  registration.
- `live` requires an approved go-live gate (owner gate #3); a site never reaches `live` while only a
  staging URL exists.
- A status change is written to the registry and to the site's `decisions.log` in the same action.
- Deleting a site row is destructive and irreversible: it needs the owner's explicit approval.

## data/<site-id>/manifest.md

Identity and settled facts. Rewritten in place as facts change; always current, never a log.

```md
# Site manifest — zbw

- id: zbw
- owner: Piotr Żabrowski
- domain: zabrowski.pl
- plan: paid
- status: live
- created: 2026-09-18T15:00:00Z
- updated: 2026-09-18T17:20:00Z

## Identity
- name as it appears: Piotr Żabrowski
- role / one-liner: "…"
- primary audience: recruiters
- voice: warm, direct
- placeholder name in use: no

## Stack decisions
- stack: frozen reference stack (unchanged)
- deviations: none
- model/tooling notes: none

## Accounts
| Purpose | Account | Status |
|---|---|---|
| source | GitHub | connected |
| hosting | Cloudflare | connected |
| data | Supabase | connected |
| AI features | DeepSeek | key stored server-side |

## URLs
- staging: https://…-preview.workers.dev
- production: https://zabrowski.pl
- repo: https://github.com/owner/zabrowski-pl

## Open items
- none
```

Rules:

- No secret values ever appear here. Accounts and URLs only, never keys, tokens or passwords.
- `Stack decisions` must state `deviations: none` when the frozen stack is used; any deviation has
  an entry in the decisions log with the owner's approval.
- `placeholder name in use` is `yes` only while a stand-in name is visible; it must be `no` before
  the go-live gate.

## data/<site-id>/decisions.log

Append-only. Never rewrite a line; correct the record with a new line.

```
[2026-09-18T15:10:00Z] intake: registered site zbw for zabrowski.pl; owner has no accounts yet
[2026-09-18T15:40:00Z] design-contract: APPROVED by owner — dark-first, serif headings, mono accents; wireframe accepted as shown
[2026-09-18T16:05:00Z] spend: owner approved $10.44/yr domain registration at Cloudflare Registrar
[2026-09-18T16:30:00Z] decision: Turnstile on the CV endpoint only; chat and JD analysis use per-IP rate limits (ADR-0007 carried over)
[2026-09-18T17:20:00Z] publish: go-live APPROVED by owner; production deploy run-20260918-03
```

Prefix vocabulary: `intake`, `design-contract`, `spend`, `decision`, `publish`, `security`,
`change`, `incident`.

**The approved design contract is recorded here**, as a `design-contract` line that carries the
owner's approval and a pointer to the approved tokens and wireframe. The design is not approved
until that line exists.

## data/<site-id>/runs/<run-id>/report.md

One report per run. `<run-id>` is `run-<date>-<seq>` (`run-20260918-01`). A run is a build, a
deploy, an audit or a content change.

```md
# run-20260918-03 — publish

- site: zbw
- kind: deploy
- started: 2026-09-18T17:00:00Z
- finished: 2026-09-18T17:20:00Z
- result: pass

## What changed
Production deploy of the approved design; apex domain attached; www redirects to apex.

## Evidence
- staging smoke: all core routes 200
- production smoke: all core routes 200; www → 301 apex
- rollback recorded: previous version id, restore command
- go-live checklist: pass

## Notes
Staging remains noindex. No open findings.
```

Rules:

- `kind` is one of `build` | `deploy` | `audit` | `content` | `design`. A later design tweak
  (Stage 6) is a `design` run.
- `result` is `pass` | `fail` | `partial`. A `fail` or `partial` must state the blocker and the next
  action in plain words.
- An `audit` run records its findings under a `## Findings` block, not in `## Notes`; each finding
  is folded into the fix or the next action.
- Every run that touched a live environment records its rollback before the change is applied.
- The report is the durable memory of the change; do not rely on the transcript.

## Lock: state/.lock

Directory-based lock (`state/.lock/`) so acquisition is atomic. Held by the first agent session
that opens the owner's home; a second session that cannot acquire stays read-only and reports why.
`scripts/ad-lock.sh` is the one implementation of this section (sourced by every `scripts/ad-*.sh`,
never executed); it is the single place that reads, reclaims and writes the lock.

Two files live inside the lock directory:

| File | Written | Holds |
|---|---|---|
| `state/.lock/owner` | at acquisition | one **type-tagged token**, never a bare number |
| `state/.lock/acquired` | at acquisition | ISO-8601 UTC timestamp (`date -u +%Y-%m-%dT%H:%M:%SZ`) |

- The owner token is `pid:<n>` when the owner is a local process, `session:<id>` when the harness
  supplies a session id (any agent, any vendor, or a human).
- `ad-home.sh status` and `ad-status.sh` read `acquired` and print it as the "since" time of the
  current holder. A missing or unreadable `acquired` is omitted, never an error.
- Releases on session end or explicit unlock; `ad-home.sh unlock` removes the whole `state/.lock/`
  directory.
- **Stale-lock rule:** only a `pid:<n>` token whose process is gone is stale, and only that lock
  may be reclaimed. A `session:<id>` token is assumed live until that session unlocks — never
  reclaim it by guessing; ask the owner.
- Recovery is fail-closed: if the token is unreadable or its type is unknown, ask the owner rather
  than delete the lock.

## The `scripts/ad-*.sh` helpers

The durable state above is created and mutated by five shell helpers in `scripts/`. They are the
executable form of this contract; nothing here changes their behaviour.

| Script | Commands | Purpose |
|---|---|---|
| `ad-home.sh` | `init`, `lock`, `unlock`, `status` | Create the home layout and manage the session lock |
| `ad-new-site.sh` | — | Register a site row and scaffold its manifest and decisions log |
| `ad-update.sh` | — | Mutate one field of a registered site and bump `updated` |
| `ad-status.sh` | — | Read-only layout, lock and site summary for reconciliation |
| `ad-lock.sh` | — | Shared lock logic; **sourced, never executed** |

```sh
scripts/ad-home.sh init                  # create $AD_HOME/{state,data} and state/sites.json
scripts/ad-home.sh lock --session web-7  # hold state/.lock for this session
scripts/ad-new-site.sh jane-co --owner "Jane Co" --domain jane.co --plan paid
scripts/ad-update.sh jane-co --status building
scripts/ad-status.sh                     # print the disk truth; writes nothing
```

### Home resolution

- `$AD_HOME` is the environment contract: when set, it is the home.
- A positional `HOME` argument overrides `$AD_HOME`.
- When neither is given, the home is `$PWD/ad-home`.
- A trailing `/` is stripped. Nothing is written outside the home.

### Session and ownership

Every command resolves one owner token for `state/.lock/owner`, in this order:

1. `$AD_SESSION_ID`, when set, becomes `session:<id>`.
2. `--owner pid:<n>|session:<id>` supplies an explicit, already type-tagged token.
   `--session <id>` is shorthand for `--owner session:<id>`.
3. Otherwise the token is `pid:$PPID` — the **invoking** shell, not the helper's own `$$`.

`--owner` and `--session` are mutually exclusive. One exception: in `ad-new-site.sh`, `--owner`
names the **site's owner** (the person recorded in the manifest and registry), not the lock token;
that script uses `--session` for the lock.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Success, or the lock is already held by this invocation |
| `1` | `state/.lock` is held by another live session; the command stays read-only |
| `2` | Refusal: bad usage or input, an unreadable or unknown lock token, or invalid state |

`ad-status.sh` only produces a report: `0` when it prints one, `2` for bad usage or an empty home
argument.

On a write (`ad_guard_write` in `ad-lock.sh`): a **free** lock is a warning only and the write
proceeds, so an unlocked home still works; a holder that is this invocation proceeds; a dead
`pid:<n>` is reclaimed and re-acquired once; a live `pid:<n>` or another session's `session:<id>`
stops the write (exit `1`); an unreadable or unknown token fails closed (exit `2`).
