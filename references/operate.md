# references/operate.md — runs, content edits, backups, monitoring, recovery

Load this at **Stage 6 (Operate)**, together with `references/secure.md` and `references/pitfalls.md`.
This is the long stage: a personal site lives after launch, not at launch. Every later owner request
is a **run** — the same durable-state discipline as a build (`AGENTS.md` §10,
`references/state-layout.md`). Nothing here is a new gate; content, copy, design and dependency
changes stay the agent's job, and only the four owner gates (`AGENTS.md` §4) interrupt the owner.

Durable state lives under `ad-home/`; the unit of work is a **site**, a change to a site is a
**run**. Chat is never authoritative: **if it is not in the manifest, the decisions log or a run
report, it did not happen.** Restart reconciles from disk.

## 1. A change is a run

One path for every later request — a content edit, a copy tweak, a design change, a dependency bump:

1. **Reconcile from disk.** Read `ad-home/data/<site-id>/manifest.md` and the latest
   `ad-home/data/<site-id>/runs/<run-id>/report.md` before acting. Never resume from chat memory.
2. **Make the change.** Through the admin surface where the owner can (§2); through code, a
   migration or a secret otherwise.
3. **Verify it.** Content: the public route reflects the change and the sanitizer still strips
   disallowed markup. Code: the `ci.yml` gate is green. Schema or security: the matching re-audit in
   §9. Deploy: live smoke on the affected target plus parity (`references/deploy.md`).
4. **Record it** as `ad-home/data/<site-id>/runs/<run-id>/report.md`. `<run-id>` is
   `run-<date>-<seq>` (`run-20260918-04`). The report carries `kind`, `result`, `## What changed`,
   `## Evidence`, `## Notes`; an `audit` run uses a `## Findings` block instead of `## Notes`.
   - `kind` is one of `build` | `deploy` | `audit` | `content` | `design` — a later design tweak is a
     `design` run, an owner content edit is a `content` run.
   - `result` is `pass` | `fail` | `partial`; a `fail` or `partial` states the blocker and the next
     action in plain words.
5. **Update the manifest** where settled facts changed: status, URLs, accounts, `deviations`, open
   items (`references/state-layout.md`).
6. **Append to `decisions.log`** where a choice was made, with the prefix vocabulary `intake`,
   `design-contract`, `spend`, `decision`, `publish`, `security`, `change`, `incident`. Append-only:
   never rewrite a line, correct it with a new line.
7. **A status change** is written to `ad-home/state/sites.json` and to `decisions.log` in the same
   action. Every run that touches a live environment records its rollback before the change is
   applied.

An owner edit made in `/admin` is still a run: the database is the source of truth for the content,
the run report is the durable memory of the change. Do not let a change live only in a transcript.

## 2. Content edits go through the admin surface, not through migrations

The owner signs in at `/admin` with the admin account
(`app_metadata.role = 'admin'`, enforced per-request server-side by `is_admin()`; client-side guards
are UX only). The admin surface writes through edge functions and the service role — never browser
RLS writes.

| Surface | Data the owner edits | Notes |
|---|---|---|
| Knowledge base | `content_collections`, `content_docs` | TipTap WYSIWYG, typed blocks (`p`, `h2`, `h3`, `list`, `steps`, `table`, `checklist`, `callout`, `diagram`, sanitized `rich`), KB image library, related-pages picker, AI tag / FAQ-label / content helpers |
| Profile | `candidate_profile`, `experiences`, `skills`, `gaps_weaknesses`, `recommendations` | nothing renders until this holds data |
| Private AI context | `values_culture`, `faq_responses`, `ai_instructions` | feeds `chat` / `analyze-jd`; never rendered as pages |
| CV | `cv_settings` | headline, summary, achievements, keywords, certifications, education, notes, `creation_prompt`; the PDF is cached in `cv_documents` |
| Home-page registries | `site_sections`, `fun_links`, `holiday_banners` | section order, fun links, seasonal banners with dismissal |
| Site copy | `site_content` | short editable copy rendered as text or sanitized |

Rules:

- Rich content is sanitized **server-side** on ingest and on output; the image library accepts
  `png/jpeg/webp/gif` up to 5 MB and **no SVG**; the sanitizer allow-list permits `<img>` over
  http(s) only, no `data:` URIs.
- **Never** change content the admin surface can edit by writing a migration or running SQL by hand.
  Migrations are the schema's source of truth; content is data. A migration used to fix a typo is a
  schema diff nobody asked for.
- After an admin edit, check the public route (hub, document, home section) and confirm the change
  is visible; then record the `content` run.

**Needs the agent, not an admin edit:**

- A new collection, route, section or block type; render logic; design tokens in code.
- Anything that changes the schema — a table, column, view, RPC, policy, grant or bucket — which is
  a migration and therefore a §9 re-audit.
- A new or changed edge function, the CORS allowlist, the header suite or the CSP.
- A dependency bump, secret rotation, domain/DNS change or plan change.
- Anything destructive or irreversible: owner gate #4 (`AGENTS.md` §4).

## 3. Backups

Content is data and data is the site. Two artifacts, both required:

```sh
supabase db dump --linked -f backup/<date>-schema.sql
supabase db dump --linked --data-only -f backup/<date>-data.sql
supabase db dump --linked --role-only -f backup/<date>-roles.sql
supabase storage cp -r ss:///kb-images ./backup/<date>-kb-images
```

- `supabase db dump` covers the database. **Storage objects are not in a database dump** — the
  `kb-images` bucket is exported separately with `supabase storage cp -r ss:///kb-images`.
- Run `supabase db dump --dry-run` once to see exactly what the dump covers before relying on it;
  managed schemas (Auth and friends) are Supabase's, not the dump's.
- `-x/--exclude` can drop regenerable tables from the data dump: `rate_limits`,
  `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`. `cv_documents` is a regenerable PDF
  cache.
- **Where backups go:** outside the site repo and outside `ad-home/`. `ad-home/` never holds secret
  values, and the repo is not a backup store. Record the location, the date and the last tested
  restore in the run report; a backup with no recorded location is not a backup.

**Test one restore.** Restore into a scratch target (a local `supabase start` stack or a throwaway
project), then verify: row counts in the main tables, public views and `get_public_*` RPCs return
data, anon writes are still denied, and `supabase db push` reports no pending migration. A restore
is a **schema event** — after restoring into a real project, re-run the final RLS audit in
`references/secure.md` §4 before trusting it. Restoring over live data is destructive: owner
gate #4.

**Not backed up by default:**

- Storage objects (`kb-images`) — only if the storage export above was run.
- Server secrets (Supabase secrets, Wrangler secrets, `SUPABASE_ACCESS_TOKEN`, `deepseek`,
  `TURNSTILE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) — keep them in a password manager, never in the
  repo or in `ad-home/`.
- Cloudflare Worker configuration and environment, DNS records and domain registration, CI
  variables and environment protection rules.
- The git repository's own configuration (branch protection, environments); the code's backup is its
  remote.
- The free tier carries no automated backup or PITR to rely on. The dump is the backup.

## 4. Monitoring

### `abuse-alert` watchdog

A scheduled edge function, every 15 minutes (`supabase/config.toml`,
`schedule = "*/15 * * * *"`). It aggregates `rag_metrics` over the `ABUSE_WINDOW_MINUTES` window,
compares call and token counts against the thresholds `ABUSE_MAX_CALLS_CHAT`, `ABUSE_MAX_CALLS_JD`,
`ABUSE_MAX_CALLS_CV` and `ABUSE_MAX_TOKENS`, and writes breach summaries to `abuse_alerts`,
surfaced in the admin panel's Monitoring view (admin `SELECT`/`UPDATE` acknowledge via
`is_admin()`). An optional counts-only mirror posts to `ABUSE_ALERT_WEBHOOK_URL`.

**Counts only — never question text, user content or PII.** The watchdog is an abuse signal for the
AI endpoints and the CV endpoint; it is not attack detection. Rate limits, input caps, response
caching and Turnstile protect against abuse and excessive AI use, not against a determined attacker
— the RLS model is the security boundary (`references/secure.md` §1).

### Health endpoint

The health endpoint returns `200` with `Content-Type: application/health+json` and the body
`{"status":"pass"}`. `scripts/verify-built-worker.mjs` asserts that contract, and asserts the other
half of it: when Supabase is unreachable, SSR **fails closed** — `5xx` with `no-store` and
`noindex`, never stale content. A fail-closed 5xx is correct behavior, not a content bug.

### Where to look when something breaks

1. The health endpoint — a passing body means the Worker is up and the fault is local to a route,
   the database or DNS.
2. The last run report and the recent commit history — what changed, and was its rollback recorded.
3. GitHub Actions runs: `ci.yml`, `deploy.yml`, `rollback.yml`, `apply-migration.yml`.
4. Cloudflare dashboard: the Worker's logs (Workers & Pages → the Worker → Logs), then DNS and TLS
   for the domain.
5. Supabase dashboard: Edge Functions logs, Database logs, Advisors (security and performance
   linters), project status.
6. Admin panel → Monitoring (`abuse_alerts`) for abuse spikes.

Never paste user content, question text or secret values into a run report, an ADR or an owner
message; record counts, status codes and locations.

## 5. Docs discipline

Three artifacts stay current with every real decision:

| File | Owns |
|---|---|
| `docs/PROJECT_REFERENCE_ARCHITECTURE.md` | the architecture as built, plus findings, compensating controls and risk acceptances |
| `docs/CI-CD-RULES.md` | the CI and deploy rules actually in force |
| `adr/ADR-000N.md` | one record per decision |

**A new ADR is required for:** any deviation from a documented default (the frozen stack, a security
default, the anon read surface, the header suite); any risk acceptance; any compensating control
standing in for a partial control; any no-silent-swap decision (`AGENTS.md` §5, §7). Records already
carried: ADR-0007 (no Turnstile on `chat`/`analyze-jd`; per-IP rate limits instead), ADR-0008 (free
tier only, §7), ADR-0009 (no MFA for the single-operator admin, §7).

The ADR is written in the same run that makes the decision, not after. A docs-only change is still a
run of its own kind and gets its report.

## 6. Dependency and platform upkeep

**Lockfile hygiene.** `.npmrc` pins `registry=https://registry.npmjs.org/`. Never ship a lockfile
resolving through a private package mirror or sandbox cache: a GitHub Actions runner cannot reach
it, so a fresh `bun install --frozen-lockfile` returns `403` and CI breaks silently — locally the
mirror is reachable, so it hides. If a bad lockfile is inherited, regenerate it from the public
registry and confirm `bun install --frozen-lockfile` is green **in CI**.

**Dependency updates.** Dependabot or equivalent stays enabled; every update lands through the
normal gate, never straight to production. A major version re-runs the full `ci.yml` set
(`bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`,
`bun run build`) and `cloudflare-migration.yml` (`wrangler deploy --dry-run` plus the built-Worker
fail-closed SSR smoke), then deploys to staging first (`references/deploy.md`).

**Secret rotation.**

| Secret | Where it lives | Rotation trigger |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secret | deploys failing with auth errors (PAT churn) |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | token expiry or scope change |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret | exposure suspicion; treat a leak as total access |
| `TURNSTILE_SECRET` | Supabase secret | Cloudflare Turnstile key rotation |
| `deepseek` | Supabase secret, read as `Deno.env.get("deepseek")` | provider key rotation |

Secrets are server-side only — set with `supabase secrets set` / Wrangler secrets, never in
`.env.local`, never committed, never in `ad-home/`. Rotating a secret that is in use is destructive:
owner gate #4. After rotating, re-deploy the affected edge functions, then re-run the live smoke and
the live CORS check. Public build vars are the only values in `.env.local`:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` — a build without
them produces a broken Worker (CI sets placeholders).

**After a platform change** — runtime, region, plan, domain, hosting config — re-run the deploy
gates in `references/deploy.md` §8 and the verification checklist in `references/secure.md` §5. A
domain or TLS change also re-verifies `www` → `301` → apex and the CORS allowlist.

## 7. Cost and limits

| Service | Free tier | Notes |
|---|---|---|
| GitHub | unlimited public repos, Actions minutes | enough |
| Cloudflare | Workers free (100k req/day), Turnstile free, DNS free | enough |
| Supabase | 500 MB DB, 1 GB storage, 500k edge-function invocations/mo | enough; stay free-tier |
| DeepSeek API | none (pay-per-token) | a $5 top-up lasts a long time |
| Domain | — | ~$10/yr |

**One-off build cost.** Building the whole site costs roughly **$1–3** of AI-provider tokens on top
of the running costs above. That is the old kit's field estimate for the reference build — treat it as
an order of magnitude, not a quote.

**Signals a site is outgrowing the free tier:**

- Cloudflare Workers request volume approaching **100k req/day** in the Cloudflare analytics, or a
  sustained bot flood visible in `abuse_alerts`.
- Supabase database approaching **500 MB** — watch `content_docs`, `rag_metrics`, `abuse_alerts`;
  storage approaching **1 GB** in `kb-images`; edge-function invocations approaching **500k/month**,
  driven by `chat`, `analyze-jd`, `generate-cv` and the watchdog itself.
- DeepSeek spend rising — watch it when the cache hit rate drops (`chat_response_cache`,
  `jd_analysis_cache`) or abuse alerts fire.
- Before assuming real content growth, confirm the housekeeping still runs: the hourly
  `rate_limits` cleanup (pg_cron) and the response caches keep the database small.

**Recorded risk acceptances — and what would invalidate each:**

| ADR | Acceptance | What invalidates it |
|---|---|---|
| ADR-0008 | Free tier only; no paid Supabase features (`sessions_timebox` is Pro-gated and stays unset) | Any ceiling above is crossed, a required capability is Pro-gated, or the owner asks for a paid feature or plan — then owner gate #2 (spend) applies and a new ADR supersedes ADR-0008 |
| ADR-0009 | No MFA for the single-operator admin. Compensating controls: single known operator, RLS `is_admin()` enforced server-side, domain-restricted signup | A second admin, business or confidential data on the site, or a shared operator account — then MFA is required on every account that deploys or holds secrets and a new ADR supersedes ADR-0009 |

Never upgrade a plan to clear a limit without asking: spend is owner gate #2. A compensating control
and a superseding ADR are written in the same run as the change.

## 8. Recovery

**Site down — order of checks:**

1. The health endpoint. `{"status":"pass"}` clears the Worker; go to DNS, TLS and `www` → `301` →
   apex.
2. Recent change? Read the latest run report and the `deploy.yml` run status. A **bad deploy** is
   recovered first, then diagnosed (§ below).
3. Cloudflare Worker logs for the failing route's status.
4. Supabase reachability and the public views the route reads.
5. DNS resolution, the apex/`www` records, certificate state.

**Supabase unreachable.** Expect a `5xx` with `no-store` and `noindex` — that is fail-closed SSR
working as designed. Do not "fix" it by serving cached content. Check, in order: the project status
in the Supabase dashboard (a free-tier project can be paused for inactivity), the project's database
and API health, then the deployed `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` values.
Nothing at the Worker is rolled back for a pure Supabase outage — restore service at Supabase, then
re-run the live smoke.

**Bad deploy.** The rollback path is owned by `references/deploy.md`: `rollback.yml` restores the
**Worker** to the recorded previous version. Know what it does not undo: **database migrations** are
not reversed (recover data from the `supabase db dump` backup), and **edge functions are not
versioned** — one Supabase project serves both targets, a function deploy changes production
immediately, so recover by re-deploying the previous function code. A rollback is itself a deploy:
after it, run the live smoke on the affected target and record the run.

**Lost or damaged data.** Restore from the database dump plus the `kb-images` storage export (§3),
re-run `supabase db push` to confirm the schema is current, and re-run the final RLS audit in
`references/secure.md` §4 — a restore is a schema event. Restoring over live data is destructive:
owner gate #4.

## 9. Re-audit triggers

A change to the security surface re-opens the matching audit in `references/secure.md`. None of
these is optional, and each result is recorded as an `audit` run.

| Trigger | Re-run |
|---|---|
| Any schema change — table, column, view, RPC, function, policy, grant | Final RLS audit: `DATABASE_SCHEMA.md` §12 A–G plus `references/secure.md` §4 assertions 1–12; then the anon probe |
| A new or changed view | `references/secure.md` §4.1 view options — `security_invoker = on` and `security_barrier = true` on every `public.*_public` view; `security_barrier = true` only on `private.api_*` views (adding `security_invoker` there breaks anonymous reads) |
| A new or changed `SECURITY DEFINER` function | `references/secure.md` §4.2 `EXECUTE` grant sweep |
| A new bucket, a storage policy change, or a MIME/size change | `references/secure.md` §4.3 `storage.objects` policy audit |
| A new or changed edge function | Admin-function auth test (`references/secure.md` §3) for any of the four admin functions; the `405`/`415` guards; the service-role grant matrix; the live CORS check |
| A dependency major, or a lockfile regeneration | `ci.yml` in full; `cloudflare-migration.yml` (dry-run + built-Worker fail-closed SSR smoke); the bundle secret scan for `sk-`, `sb_secret_`, `0x3…` in `dist/` |
| A platform change — runtime, region, plan, domain | The deploy gates in `references/deploy.md` §8 and the verification checklist in `references/secure.md` §5 |

Every re-audit is run by the agent and reported with evidence; a failure stops the change — fix it or
report it, never proceed and mention it later (`AGENTS.md` §11).

## Source map

| Section here | Old-kit source |
|---|---|
| 1. A change is a run | `AGENTS.md` Stage 6 ("Treat every later owner request as a run") and §10; `references/state-layout.md` (run report, kinds, results, status change); `PLAN_AI_DISTRIBUTION.md` §5.6, §4 |
| 2. Content edits through the admin surface | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 5 (admin), Phase 3 (profile/publication rules), Phase 8 ("Abuse vs attack"), "Non-negotiables" item 5; `GUIDE_FROM_SCRATCH.md` Step 8 (populate via admin panel), Step 10 (Try the admin panel), Step 11 (admin-function auth); `DATABASE_SCHEMA.md` §6, §8, §9; `references/build.md` §4 |
| 3. Backups | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 ("Backups before launch"); `GUIDE_FROM_SCRATCH.md` Step 13 gate 4, Step 14 ("No backups = no site"); `DATABASE_SCHEMA.md` §8 (`kb-images`), §11 |
| 4. Monitoring | `GUIDE_FROM_SCRATCH.md` Step 14 ("If you get stuck", edge-function deploy note), Step 11 (abuse watchdog); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 (`abuse-alert`), Phase 7 (`verify-built-worker.mjs` health contract); `DATABASE_SCHEMA.md` §6 (`rag_metrics`, `abuse_alerts`), §9 (`abuse-alert` matrix row); `references/secure.md` §2 item 14 |
| 5. Docs discipline | `SKILL_INTERACTIVE_PORTFOLIO.md` "Non-negotiables" item 7, Phase 8 (record findings and risk acceptances); `GUIDE_FROM_SCRATCH.md` Step 13 (findings in the three docs); `AGENTS.md` Stage 6, §5.7 |
| 6. Dependency and platform upkeep | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1 (public registry/lockfile rule), Phase 7 (auth and secrets), Phase 8 (secret + dependency scanning); `GUIDE_FROM_SCRATCH.md` Step 12 (credentials, PAT churn), Step 14 (PAT churn); `references/build.md` §1.1; `references/deploy.md` §5, §8 |
| 7. Cost and limits | `GUIDE_FROM_SCRATCH.md` Step 14 ("Costs and free-tier limits"), Step 14 ("Known pitfalls"); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 risk acceptances (ADR-0007, ADR-0008, ADR-0009); `references/secure.md` §2 recorded decisions |
| 8. Recovery | `GUIDE_FROM_SCRATCH.md` Step 14 ("If you get stuck"), Step 13 gate 4 (restore); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 (`rollback.yml`); `references/deploy.md` §6, §7; `references/secure.md` §2 item 10 (fail-closed SSR) |
| 9. Re-audit triggers | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 (final RLS audit "run at the very end", independent review), "Verification checklist"; `GUIDE_FROM_SCRATCH.md` Step 13; `DATABASE_SCHEMA.md` §11, §12; `references/secure.md` §4.1, §4.2, §4.3, §5 |
