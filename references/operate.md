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
| Profile | `candidate_profile`, `experiences`, `skills`, `gaps_weaknesses`, `recommendations` | nothing renders until this holds data; a translation written by `translate-recommendation` stays unserved until the admin confirms it (`translation_reviewed`) |
| Private AI context | `values_culture`, `faq_responses`, `ai_instructions` | feeds `chat` / `analyze-jd`; never rendered as pages |
| CV | `cv_settings` | headline, summary, achievements, keywords, certifications, education, notes, `creation_prompt`; the PDF is cached in `cv_documents` |
| Home-page registries | `site_sections`, `fun_links`, `holiday_banners` | section order, fun links, seasonal banners with dismissal |
| Site copy | `site_content` | short editable copy rendered as text or sanitized |

Rules:

- Rich content is sanitized **server-side** on ingest and on output; the image library accepts
  `png/jpeg/webp/gif` up to 5 MB and **no SVG**; the sanitizer allow-list permits `<img>` over
  **https** only, no `data:` URIs, hosts limited to the CSP `img-src` allowlist.
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
- **Frequency and retention:** `backup.yml` runs daily (off-peak) and on manual dispatch; it takes
  the schema, data and role dumps plus the `kb-images` export and uploads them to the off-platform
  destination. Keep **14 days**; older copies are deleted by the same job.
- **Off-platform means off Supabase.** The destination is a different provider or account from
  the Supabase project (for example an object-storage bucket the owner controls) — a dump stored
  inside the platform it backs up does not survive that platform's failure or a lost account.
  Choosing it may need an account or a plan: that is owner gate #2 (`AGENTS.md` §4), so ask before
  creating one.
- **A restore is tested at least monthly**, not only once, and the date of the last tested restore
  is recorded in the run report.
- Record the policy in `docs/CI-CD-RULES.md` (it is a CI rule, not a private habit).
- **Retention with tiers, not a single window.** Daily copies for 14 days, a weekly copy for 8
  weeks and a monthly copy for 12 months: a 14-day window cannot recover corruption that was
  discovered late, and by then the daily copies are gone. Object **versioning or immutable retention
  at the destination** protects against the deletion path itself — a stolen credential or a runaway
  automation must not be able to erase every copy.
- **Separate the keys and the administrators.** Backups are encrypted with a key that is not stored
  with the credentials that write them, and the destination account is not the account that runs
  production: recovering from a compromise must not require the compromised credentials. Alert on
  backup deletion, on retention-policy change and on a missed backup.
- **Write down the objectives:** a recovery-point objective (how much data loss is acceptable — one
  day with dumps, minutes only with PITR) and a recovery-time objective (how long a restore may
  take). Measure both at least once, and treat a missed objective as a finding, not a statistic.
- **Configuration is part of recovery, and it does not live in the database.** Export and keep
  current: DNS records and the domain registration details, the Worker configuration and its routes,
  CI variables and environment protection rules, repository settings, and the **names** of every
  secret with its owner and rotation step (never the values — a password manager holds those). Plus
  a break-glass path that has been tested: the ability to regain access to GitHub, Cloudflare, the
  Supabase project, the AI provider and the backup destination if a phone or a mailbox is lost.
- **A verified backup is taken immediately before anything destructive or schema-changing**
  (`references/deploy.md` §6), and the free tier's lack of point-in-time recovery is a recorded
  acceptance with an expiry, not a fact of life (`references/assurance.md` §3).

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

### 4.1 Security telemetry — separate from cost telemetry

The watchdog below is a **cost and abuse** signal. Attack detection is a different job and needs its
own events, its own thresholds and its own destination:

| Event | Why it matters | Source |
|---|---|---|
| Repeated authentication failures, and any success after a burst of them | password or token guessing against `/admin` or an admin function | Auth logs, admin-function responses (counts only) |
| Account created; `app_metadata.role` changed | the two events that turn a stranger into an administrator | `admin_audit` (§4.3 hooks) and Auth logs |
| Grant, policy, view-option or storage-policy change | the RLS boundary is the security boundary; a change to it is a security event, not a migration detail | `supabase migration list` diff and the §12 audit run per release |
| Large or unusual reads (row counts, off-hours patterns) | data exfiltration is quiet — volume is the signal | Postgres logs / `pg_stat_statements` |
| Secrets: access anomalies, rotation failures, token use outside the approved workflows | a leaked service-role key is total access | Cloudflare/Supabase audit logs, GitHub Actions logs |
| RLS denial spikes | an application bug or an enumeration attempt — both are findings | Postgres logs (`policy` denials) |
| Security-header regression on a live route | a deploy that silently dropped `frame-ancestors`, HSTS or the CSP nonce | the live header check in `references/secure.md` §5 |

Each event carries a severity, an owner and an escalation path, goes to an **off-platform**
destination (not only the dashboard of the platform it watches), and is tested once with a
controlled event — an alert nobody has ever seen fire is not an alert.

**The audit export.** `admin_audit` (`DATABASE_SCHEMA.md` §2.3) is exported off-platform on the same
schedule as the backups, and the `cleanup-admin-audit` prune refuses to run until that export
confirms the batch: the trail is pruned only from a copy that already exists elsewhere. Correlate it
with the identity and application logs by `request_id` when investigating an administrative change.

### 4.2 Incident process

Severity decides who is woken and how fast:

| Severity | Example | Response |
|---|---|---|
| **S1** | live site serving private data; admin account taken over; service-role key exposed | contain first (take the site down or rotate the key), then investigate; owner informed immediately |
| **S2** | public write path abused; AI spend runaway; a policy or grant change nobody made | contained within the same day; evidence preserved before any change |
| **S3** | single alert, no sign of impact; a failed gate that stopped a deploy | handled in the next run, recorded |

Playbooks — short, written, rehearsed once — for the four that actually happen: **credential
compromise** (rotate, re-deploy, re-read the logs for use, then decide on notification),
**data exposure** (contain, preserve evidence, establish which rows and who saw them, assess
notification duties), **AI abuse** (turn the breaker, then look at cache and cost), and
**supply chain** (freeze deploys, pin back, rebuild from a known-good manifest). Evidence is
preserved before remediation wherever the two conflict: fix the incident, but do not destroy the
record of it. One tabletop exercise — walk an S1 scenario end to end on paper — is part of
production readiness, and the record of it lives with the run reports.

### 4.3 Content takedown

Published content and uploaded images are cacheable, so removal is two steps, not one: delete the
row or the storage object, then purge the cache (CDN and the browser-facing route) — a deleted image
that is still cached is still published. Record the removal: what, when, why, and by whom, in
`admin_audit` where the change went through the admin surface. For a public bucket the removal is
time-sensitive (`DATABASE_SCHEMA.md` §8): an object URL that has already been fetched cannot be
recalled.

### 4.4 Cost and abuse signals

#### `abuse-alert` watchdog

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

#### Webhook contract

- Destination: the owner's incident channel, chosen once and recorded in
  `docs/PROJECT_REFERENCE_ARCHITECTURE.md`; the URL itself is the credential.
- Authentication: the URL carries its token — treat it as a secret (Supabase secret, never in
  `.env.local`, never logged, never in a run report or a chat message). Counts only, same rule as
  `abuse_alerts.detail`: no question text, no user content, no IPs.
- Rotation: rotate it when the channel changes, when a responder loses access, or on any suspicion
  of exposure, and after rotating re-deploy `abuse-alert`.

#### Health endpoint

The health endpoint returns `200` with `Content-Type: application/health+json` and the body
`{"status":"pass"}`. `scripts/verify-built-worker.mjs` asserts that contract, and asserts the other
half of it: when Supabase is unreachable, SSR **fails closed** — `5xx` with `no-store` and
`noindex`, never stale content. A fail-closed 5xx is correct behavior, not a content bug.

#### Where to look when something breaks

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

Three artifacts stay current with every real decision — **in the site's own repository, not this
distribution**:

| File | Owns |
|---|---|
| `docs/PROJECT_REFERENCE_ARCHITECTURE.md` | the architecture as built, plus findings, compensating controls and risk acceptances |
| `docs/CI-CD-RULES.md` | the CI and deploy rules actually in force |
| `adr/ADR-000N.md` | one record per decision |

**The `ADR-000N` numbers cited throughout this distribution are labels, not documents.** No ADR file
ships here. Each number names a decision whose substance is stated in the sentence that cites it —
the sentence is what binds, the number is only a handle. The earlier ones (ADR-0007 … ADR-0011) are
the reference build's filings; the cost-bound ones (ADR-0012 … ADR-0016) were added by the hardening
revisions that produced this distribution. The site opens its own `adr/` series when it is built and
need not match either set; a number cited here that the site has not recorded is a to-do, not a
fact.

**A new ADR is required for:** any deviation from a documented default (the frozen stack, a security
default, the anon read surface, the header suite); any risk acceptance; any compensating control
standing in for a partial control; any no-silent-swap decision (`AGENTS.md` §5, §7); a change to
the data-minimization rules (the `rag_metrics` preview/TTL, the `abuse_alerts.detail` shape) or to
the anon read surface — record the minimization rule and its legal basis as **ADR-0010** when the
site is built.

The reference build filed the decisions above under these labels: ADR-0007 (no Turnstile on
`chat`/`analyze-jd`; per-IP rate limits instead), ADR-0008 (free tier only, §7), ADR-0011 (the CV
gate's accepted residual risk) and the cost-bound rows below — plus ADR-0009, which was filed as "no
MFA on the Supabase-hosted admin login" and then **withdrawn once the providers' documentation was
checked**: Supabase's plan table includes Basic (TOTP) MFA, so the admin login carries TOTP with
`aal2` enforced, and only phone MFA turned out to be paid.

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
| `ABUSE_ALERT_WEBHOOK_URL` | Supabase secret (URL-embedded token) | channel change, responder loses access, or exposure suspicion |

Secrets are server-side only — set with `supabase secrets set` / Wrangler secrets, never in
`.env.local`, never committed, never in `ad-home/`. **Rotate on a schedule as well as on
suspicion** — a long-lived token that nobody ever rotates is a standing liability, and the rotation
is also the only proof that the procedure works. Rotate the deploy tokens (`SUPABASE_ACCESS_TOKEN`,
`CLOUDFLARE_API_TOKEN`) and the provider keys (`deepseek`, `TURNSTILE_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`) at least twice a year, and alert on use outside the approved workflows
(`references/deploy.md` §5). Rotating a secret that is in use is destructive:
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
  `cleanup-rate-limits`, the daily `cleanup-rag-metrics` (7-day metric TTL) and the daily
  `cleanup-cv-documents` (30-day PDF-cache TTL) keep the database small — all three are defined in
  `DATABASE_SCHEMA.md` §7.

**Recorded risk acceptances — and what would invalidate each:**

An acceptance is a decision with a shelf life, not a note. Every row carries an owner, the date it
was approved, an **expiry**, a review cadence, the trigger that invalidates it and the remediation it
waits for; `references/assurance.md` §3 holds the register and the rule that an expired critical
acceptance blocks promotion.

**Plan facts are checked, not assumed.** Every plan claim in these rows was verified against the
providers' own documentation on **2026-09-25** — Supabase's pricing table, Cloudflare's WAF managed
rules and R2 pricing pages, GitHub's code-scanning availability, and DeepSeek's API pricing — and
plans change, so re-check them at each release. A control that turns out to be free is required, not
accepted: that is how ADR-0009 fell.

| ADR | Acceptance | Owner | Expires / review | What invalidates it |
|---|---|---|---|---|
| ADR-0008 | Free tier only; no paid Supabase features (`sessions_timebox` is Pro-gated and stays unset). This is the constraint that shapes every other row — anything the free plans already give us is required, never accepted | owner | reviewed each release; expires when a ceiling is hit | Any ceiling above is crossed, a required capability is Pro-gated, or the owner asks for a paid feature or plan — then owner gate #2 (spend) applies and a new ADR supersedes ADR-0008 |
| ADR-0009 | ~~No MFA on the Supabase-hosted admin login.~~ **Withdrawn — MFA is free, and the check proved it.** Supabase's plan table lists *Basic Multi-Factor Auth* as **included on Free**; only *Advanced MFA (Phone)* is the paid add-on. TOTP (an app authenticator) is therefore required on the admin login, and `aal2` is enforced server-side: privileged policies add a restrictive check on the `aal` claim. The compensating controls stay, because they cost nothing: signup disabled with a user-id allowlist, a long unique password in the password manager, the reset mailbox behind MFA, short token lifetimes with revalidation, the audit trail and auth-failure telemetry | owner | withdrawn; superseded by the MFA requirement in `references/secure.md` §2 item 13 | — |
| ADR-0011 (to record) | `generate-cv`'s only non-browser gate is Turnstile plus the per-IP limit; CORS is browser-only, so the rate limit is the abuse backstop, not attack protection. Both controls are free | owner | reviewed each release | Targeted abuse of the CV endpoint at volume, confidential material in the CV, or a second control becoming available — then add it and supersede the ADR |
| ADR-0012 (to record) | **Narrowed by the verified plan:** production plus a **staging project** with its own database, functions and keys is affordable on the free plan — Supabase documents *"Limit of 2 active projects"* and answers the development/production question with exactly that pair, and running Supabase locally (CLI or Docker) is free and unlimited for development. The residual is the free tier's own behaviour, not the count: a free project **pauses after 1 week of inactivity** (unpause before a release), database branching is a paid add-on (so environments are separate projects, not branches), and a third *hosted* environment is not affordable | owner | reviewed each release | A release that needs a third hosted environment, a second operator, or a plan change — then add it and supersede the ADR (`DATABASE_SCHEMA.md` §11, `references/deploy.md` §6) |
| ADR-0013 (to record) | **No managed database backup and no point-in-time recovery:** Supabase lists *Automatic backups — not included* on Free and prices PITR as a paid add-on, so our own dumps are the recovery point and up to one backup interval of data can be lost. Compensating controls are free: tiers (daily/weekly/monthly), a verified backup immediately before anything destructive or schema-changing, and an off-platform destination inside a free object-storage tier (Cloudflare R2 documents 10 GB-month free, with free egress) | owner | reviewed each release | A recovery-point objective shorter than the dump interval, any destructive operation without a fresh verified backup, or a plan that includes managed backups or PITR — then enable it and supersede the ADR (`references/operate.md` §3) |
| ADR-0014 (to record) | **AI spend is bounded by a prepaid balance, not by a provider cap.** DeepSeek deducts per token from a topped-up balance and documents no console-level spend limit, so the ceiling is however much is topped up. Controls, both free: keep the topped-up balance at the size of one month's budget (the balance itself is the hard stop) and keep our own global token/cost budget with a circuit breaker in front of the endpoints (`references/secure.md` §7, AI cost) | owner | reviewed each release | The provider shipping spend caps, a gateway with limits becoming affordable, a month where the breaker trips, or a balance large enough to matter — then re-size the budget or move the gate |
| ADR-0015 (to record) | **Platform logs cannot be the security record.** Supabase's free plan keeps API and database logs for **1 day** and Auth audit logs for **1 hour**, and log drains are a paid add-on; the platform audit log and metrics endpoint are paid too. Compensating control is free: security telemetry is written to our own tables and mirrored off-platform, and the administrative audit trail is ours, kept 400 days (`references/operate.md` §4.1, `DATABASE_SCHEMA.md` §2.3) | owner | reviewed each release | An incident whose evidence window predates our retention, or a plan with drains and longer retention — then add drains and extend retention |
| ADR-0016 (to record) | **Edge WAF coverage on the free plan is the Free Managed Ruleset only** — Cloudflare's availability table shows *Free Managed Ruleset: Yes* on Free, while the Cloudflare Managed Ruleset and the OWASP Core Ruleset are paid. So the ingress is the Worker plus a shared secret plus our own rate limits, with the **Free Managed Ruleset enabled** (it is free — enable it rather than accept anything) | owner | reviewed each release | Sustained L3/L7 abuse that the free ruleset and the rate limits cannot hold, or a plan that affords the fuller rulesets — then enable them and supersede the ADR |

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
| A change to a `*_public` view's projected columns (adding or removing a column) | `references/secure.md` §4.1 view options, then the anon probe (`DATABASE_SCHEMA.md` §12 G1) — confirm the new column is either intentionally public or pruned |
| A change to a retention/TTL or cleanup job (`rag_metrics`, `cv_documents`, caches, `admin_audit`) | Re-check the scheduled jobs in `DATABASE_SCHEMA.md` §7 and the minimization note in §2.3 |
| A change to the upload pipeline, the image bucket or the sanitizer allowlist | `references/secure.md` §7 (uploads, content) — re-run the ingest corpus and the sanitizer suite |
| A change to a cache key or cache rules | `references/secure.md` §7 (AI caches) — confirm the version binding and the invalidation path |
| A change to the ingress, the trusted IP source or the rate-limit key | `references/secure.md` §7 (ingress) — re-run the spoofed-header tests and the direct-invocation test |
| A change to telemetry, alerts, the audit trail or the backup destination | `references/secure.md` §7 (monitoring, audit, backups) — fire one controlled event, and restore once |

Every re-audit is run by the agent and reported with evidence; a failure stops the change — fix it or
report it, never proceed and mention it later (`AGENTS.md` §11).

## Source map

| Section here | Old-kit source |
|---|---|
| 1. A change is a run | `AGENTS.md` Stage 6 ("Treat every later owner request as a run") and §10; `references/state-layout.md` (run report, kinds, results, status change) |
| 2. Content edits through the admin surface | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 5 (admin), Phase 3 (profile/publication rules), Phase 8 ("Abuse vs attack"), "Non-negotiables" item 5; `GUIDE_FROM_SCRATCH.md` Step 8 (populate via admin panel), Step 10 (Try the admin panel), Step 11 (admin-function auth); `DATABASE_SCHEMA.md` §6, §8, §9; `references/build.md` §4 |
| 3. Backups | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 ("Backups before launch"); `GUIDE_FROM_SCRATCH.md` Step 13 gate 4, Step 14 ("No backups = no site"); `DATABASE_SCHEMA.md` §8 (`kb-images`), §11 |
| 4. Monitoring | `GUIDE_FROM_SCRATCH.md` Step 14 ("If you get stuck", edge-function deploy note), Step 11 (abuse watchdog); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 (`abuse-alert`), Phase 7 (`verify-built-worker.mjs` health contract); `DATABASE_SCHEMA.md` §6 (`rag_metrics`, `abuse_alerts`), §9 (`abuse-alert` matrix row); `references/secure.md` §2 item 14 |
| 5. Docs discipline | `SKILL_INTERACTIVE_PORTFOLIO.md` "Non-negotiables" item 7, Phase 8 (record findings and risk acceptances); `GUIDE_FROM_SCRATCH.md` Step 13 (findings in the three docs); `AGENTS.md` Stage 6, §5.7 |
| 6. Dependency and platform upkeep | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1 (public registry/lockfile rule), Phase 7 (auth and secrets), Phase 8 (secret + dependency scanning); `GUIDE_FROM_SCRATCH.md` Step 12 (credentials, PAT churn), Step 14 (PAT churn); `references/build.md` §1.1; `references/deploy.md` §5, §8 |
| 7. Cost and limits | `GUIDE_FROM_SCRATCH.md` Step 14 ("Costs and free-tier limits"), Step 14 ("Known pitfalls"); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 risk acceptances (ADR-0007, ADR-0008, ADR-0009); `references/secure.md` §2 recorded decisions |
| 8. Recovery | `GUIDE_FROM_SCRATCH.md` Step 14 ("If you get stuck"), Step 13 gate 4 (restore); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 (`rollback.yml`); `references/deploy.md` §6, §7; `references/secure.md` §2 item 10 (fail-closed SSR) |
| 9. Re-audit triggers | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 (final RLS audit "run at the very end", independent review), "Verification checklist"; `GUIDE_FROM_SCRATCH.md` Step 13; `DATABASE_SCHEMA.md` §11, §12; `references/secure.md` §4.1, §4.2, §4.3, §5 |
