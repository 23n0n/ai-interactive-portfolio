# references/deploy.md — domain, hosting, CI, staging-first, rollback

Publishing is two events, in this order: a **staging link the owner can click**, then a **public
site on its own domain**. Staging is never skipped and never optional. The stack is the frozen
reference stack — deploying is not a licence to swap it (`AGENTS.md` §7). Deploy runs are recorded
per `references/state-layout.md`; the security controls that back every live target are in
`references/secure.md`; the build commands are in `references/build.md`.

## 1. Staging first

- Build a staging target and give the owner a **clickable link before anything is public**. The
  site reaches status `staging` only when that link exists (`references/state-layout.md`).
- Staging is **`noindex`** at every layer: `robots.txt` plus `X-Robots-Tag: noindex`. It is
  reachable, not indexable, and it is not the deliverable.
- Production is reached only through the **go-live owner gate** (`AGENTS.md` §4, gate 3): say what
  will happen, what it costs, what could go wrong, and what you will do if it does; wait for a clear
  yes. Silence, a maybe or an unanswered question is not approval.
- Push-to-staging is automatic (deploy branch; docs-only paths ignored). Production is always a
  manual dispatch against the protected `production` environment.
- Verify **both** targets after every deploy — the smoke test and the parity check (§3, §4, §8).

## 2. Environments

One Cloudflare Worker, two configured targets, one Supabase project.

| | Staging / preview | Production |
|---|---|---|
| Worker | persistent preview worker | the site worker |
| Host | `<name>-preview.<account>.workers.dev` | custom domains: apex + `www` |
| `workers_dev` | on (workers.dev URL) | `false` |
| Indexing | `noindex` (`robots.txt` + `X-Robots-Tag`) | indexable |
| Config patch | `scripts/patch-wrangler.mjs preview` | `scripts/patch-wrangler.mjs prod` |
| Trigger | push to deploy branch | `workflow_dispatch`, protected `production` environment |
| `www` | — | `301` to apex, applied worker-side |

- `scripts/patch-wrangler.mjs` rewrites `dist/server/wrangler.json`; it is the only place the
  environment difference is encoded. Preview gets the workers.dev host, the `noindex` state and the
  `*-preview` worker name; prod sets `workers_dev=false` and attaches the custom domains. Never
  hand-edit `dist/`.
- The apex is the canonical origin; `www` redirects to it with a `301`, worker-side.
- **One Supabase project serves both targets.** There is no database-level staging and **no
  function-level staging**: edge functions deploy only with production, so a function deploy changes
  production immediately (§3, §6). Treat every edge-function deploy as a production event.
- Custom domains and TLS: with the domain on Cloudflare DNS, add apex and `www` under the Worker's
  **Settings → Domains & Routes → Custom domain**; Cloudflare provisions DNS and TLS automatically.

## 3. Workflows

All live under `.github/workflows/`.

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | push, pull request | always-on CI: `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` |
| `cloudflare-migration.yml` | push, pull request | Cloudflare-side validation of the built Worker: `wrangler deploy --dry-run` plus `scripts/verify-built-worker.mjs` — the fail-closed SSR smoke with placeholder public env |
| `deploy.yml` | staging: push to deploy branch; production: `workflow_dispatch` | the two-target deploy below |
| `rollback.yml` | manual (`workflow_dispatch`) | restores the recorded previous Worker version (§7) |
| `apply-migration.yml` | manual (`workflow_dispatch`) | applies committed migrations to the linked Supabase project — the workflow form of `supabase db push` (§6) |
| `cloudflare-preview.yml` | branch-restricted `workflow_dispatch`, optional | public build vars only; build + `wrangler deploy --dry-run` + deploy to a workers.dev preview URL, `noindex`; inert until dispatched — staging covers the same ground |

The old kit records `ci.yml` and `cloudflare-migration.yml` as one validation block
(build/typecheck/lint/test + dry-run + fail-closed SSR smoke); treat them as the always-on pair that
must be green before either target moves.

`deploy.yml` in full:

- **Staging job** — auto on push to the deploy branch, docs-only paths ignored: build;
  `scripts/patch-wrangler.mjs preview`; `wrangler deploy` to the persistent preview worker
  (workers.dev, `noindex`); live smoke (`scripts/smoke-test-live.mjs`, `EXPECT_NOINDEX=true`);
  blue/green parity against production (`scripts/verify-public-parity.mjs`).
- **Production job** — `workflow_dispatch` against the protected `production` environment (required
  reviewers, branch restriction to the deploy branch): build; `scripts/patch-wrangler.mjs prod`;
  `wrangler deploy` to the custom domains (apex + `www`, `www` 301 to apex worker-side); live smoke;
  the edge-function deploy job (`scripts/deploy-edge-functions.sh`, `--no-verify-jwt`, production
  only); the live CORS check (`scripts/verify-cors-live.mjs`); the human browser checklist.
- A **docs-only** push skips deploy on both targets.

## 4. Script contracts

Every script below is CI-wired. Write each to its contract; names, flags and env vars are exact.

### `scripts/patch-wrangler.mjs <preview|prod>`
- Patches `dist/server/wrangler.json`.
- `preview`: workers.dev hostname, `noindex`, `*-preview` worker name.
- `prod`: `workers_dev=false`, custom domains (apex + `www`).

### `scripts/smoke-test-live.mjs`
- Env: `BASE_URL`; optional `EXPECT_NOINDEX=true`.
- Asserts every route in the core route list returns `200`.
- When `EXPECT_NOINDEX=true`, also asserts `x-robots-tag: noindex` on the response.
- Exit codes: `0` pass, `1` fail, `2` missing env.

### `scripts/verify-public-parity.mjs`
- Env: `BLUE_URL` (default: production) and `GREEN_URL` (the candidate target).
- Fetches the core route list on both and compares the HTML.
- Skips routes absent in either environment (e.g. `/admin`, `/auth`).

### `scripts/verify-cors-live.mjs`
- Per-edge-function live CORS check against the committed allowlist.
- Also asserts the Turnstile allow-header state: absent on `chat` / `analyze-jd`, present on
  `generate-cv`.

### `scripts/verify-built-worker.mjs`
- Wrangler test harness over the built Worker.
- Health endpoint must return `200` with `application/health+json` and body `{"status":"pass"}`.
- SSR must **fail closed** when Supabase is unreachable — `5xx`, no stale content. CI proves it by
  passing an RFC-reserved `.invalid` host as the Supabase URL.

### `scripts/deploy-edge-functions.sh`
- Loops `supabase/functions/*/index.ts`; skips `_shared`.
- Deploys each function with `--no-verify-jwt`.
- Idempotent: re-running deploys the same functions without side effects.
- Oversized bundle (`413`) → skip that function with a warning; do not fail the whole run.

## 5. Auth and secrets

Repo **Settings → Secrets and variables → Actions**:

| Name | Kind | Value / permission |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | Cloudflare API token: `Account > Workers Scripts > Edit` + `Zone > Workers Routes > Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | variable | Cloudflare account id — workflows read `vars.*` |
| `SUPABASE_ACCESS_TOKEN` | secret | a fresh Supabase PAT (dashboard → avatar → Account settings → Access Tokens → Generate new token) |

- **Jobs fail fast when a secret or variable is missing.** No fallback default, no "probably fine".
- Environments: `staging` (unprotected) and `production` (required reviewers, branch restriction to
  the deploy branch).
- Local `wrangler login` OAuth is a **fallback only**; CI uses the tokens.
- **Never commit a token.** No token, key or connection string in the repo, in `.env.local` (public
  build vars only) or in any `ad-home/` record. Server-side secrets (service role, Turnstile secret,
  the `deepseek` key) live in Supabase secrets / Wrangler secrets; set them once with
  `supabase secrets set` (`references/secure.md`).
- **PAT churn:** when deploys start failing with auth errors, refresh `SUPABASE_ACCESS_TOKEN` from
  the dashboard.
- MFA is required on every account that can deploy or hold secrets (GitHub, Cloudflare, Supabase,
  DeepSeek).

## 6. Migrations

**Deploy workflows never apply migrations.** `deploy.yml` ships code; it does not touch the
database. The database and its migrations are owned by `references/schema/` (`seeds.md`, source
§11), applied through `apply-migration.yml`, `supabase db push`, the Management API
or the dashboard SQL editor.

Ordering — and why it is not negotiable:

1. Apply pending migrations to the linked project first.
2. Only then deploy the schema-dependent Worker change.

The Worker reads the schema at request time; a Worker that expects a new column, view or RPC would
otherwise go live against a database that does not have it yet. Applying first also keeps the old
Worker valid during the window before the new one is live. **If a change depends on schema, the
migration is the first step of that deploy, not a follow-up.**

- Migrations are committed under `supabase/migrations/` with timestamped names
  (`YYYYMMDDHHMMSS_description.sql`) and are the single source of truth for the schema.
- RLS is enabled in the same migration that creates a table — never later (`references/secure.md`).
- The migration gate itself (RLS enumeration, anon read/write, admin CRUD, storage, signup domain,
  `check_rate_limit`) is `DATABASE_SCHEMA.md` §11.

## 7. Rollback

- **Record the rollback before every production deploy.** The run report carries the version id
  currently live and the restore command; that record is what makes the deploy reversible
  (`references/state-layout.md`).
- `rollback.yml` restores the **Worker** to the recorded previous version — the Worker-level undo of
  a bad deploy.
- What it does **not** restore: **database migrations**, which deploy workflows never apply and a
  Worker rollback does not reverse — recover data from the `supabase db dump` backup instead. It
  also does not version **edge functions**: one Supabase project is shared by both targets, a
  function deploy changes production immediately, and there is no function-level staging; recover by
  re-deploying the previous function code.
- A rollback is a deploy: after it, run the live smoke on the affected target and record the run
  like any other.

## 8. Deploy gates

Nothing reaches a target whose gates are not green. The security-side gates are owned by
`references/secure.md`; this table is the deploy subset.

| Gate | Before staging | Before production |
|---|---|---|
| `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` green (`ci.yml`) | ✓ | ✓ |
| `wrangler deploy --dry-run` + built-Worker fail-closed SSR smoke with placeholder env (`cloudflare-migration.yml`) | ✓ | ✓ |
| Pending migrations applied (§6) — required when the change is schema-dependent | ✓ | ✓ |
| Live smoke: every core route `200`, and `noindex` on staging (`scripts/smoke-test-live.mjs`) | ✓ | ✓ |
| Blue/green parity against production (`scripts/verify-public-parity.mjs`) | ✓ | ✓ |
| Recorded rollback: previous version id + restore command in the run report (§7) | — | ✓ |
| Final RLS audit (`DATABASE_SCHEMA.md` §12 A–G), admin-function auth test, independent security review, backups configured and one restore tested | — | ✓ |
| Live CORS check (`scripts/verify-cors-live.mjs`) | — | ✓ |
| Owner gate: go live publicly (`AGENTS.md` §4, gate 3) — explicit yes | — | ✓ |
| Human browser checklist: Turnstile widget, WYSIWYG image flow, admin CRUD, CV download on desktop + mobile | — | ✓ |

- A failed gate stops the deploy. Fix it or report it; never proceed and mention it later.

## Source map

| Section here | Old-kit source |
|---|---|
| 1. Staging first | `AGENTS.md` Stage 4 (Publish); `PLAN_AI_DISTRIBUTION.md` §5 (Publish); `GUIDE_FROM_SCRATCH.md` Step 12; `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 |
| 2. Environments | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1 (`preview` env), Phase 7 (`patch-wrangler.mjs`, `www` 301 apex); `GUIDE_FROM_SCRATCH.md` §2.2 (custom domain), Step 14 (edge functions deploy only with production) |
| 3. Workflows | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 "Workflows" + `deploy.yml`; `GUIDE_FROM_SCRATCH.md` Step 12 |
| 4. Script contracts | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 "Script contracts" |
| 5. Auth and secrets | `GUIDE_FROM_SCRATCH.md` Step 12 credentials checklist, §2.2 (API token); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 0 (Supabase CLI auth), Phase 7 "Auth"; `GUIDE_FROM_SCRATCH.md` Step 14 (PAT churn) |
| 6. Migrations | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 3, Phase 7 ("DB migrations NOT applied by deploy workflows"); `GUIDE_FROM_SCRATCH.md` Step 12; `DATABASE_SCHEMA.md` preamble + §11 |
| 7. Rollback | `AGENTS.md` Stage 4 ("a recorded rollback before each production deploy"); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 (`rollback.yml`); `references/state-layout.md` run-report rollback field; `GUIDE_FROM_SCRATCH.md` Step 14 (edge functions deploy only with production) |
| 8. Deploy gates | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 7 gate, "Verification checklist", Phase 8; `GUIDE_FROM_SCRATCH.md` Step 12 `[Check]`, Step 13; `AGENTS.md` Stage 4; `PLAN_AI_DISTRIBUTION.md` §5 |
