# references/build.md — scaffold, data layer, sections, content model, features

Load this at **Stage 3 (Build)**, for the scaffold, data-layer gate, section, content-model and
feature sub-stages. Load `references/pitfalls.md` alongside it. Load `references/schema/*` **only**
for the data-layer sub-stage, and never load `references/deploy.md` here — the progressive-loading
rules are in `AGENTS.md` §8.

Stage 3 turns the approved design contract into a working site on a private preview link. Run the
sub-stages in order; each gate (§6) must be green before the next. The stack is frozen
(`AGENTS.md` §6–§7) — no silent swaps; a change that genuinely cannot
be made on this stack stops and asks the owner, then is recorded.

Machine-readable routes (`llms.txt`, `sitemap.xml`, markdown negotiation, `.well-known/`), JSON-LD
and SERP meta are **not** in this file — they belong to `references/distribute.md` (Stage 5). The
`sitemap` edge function is still **deployed** here, in the Stage 3 inventory below, like every other
function; what Stage 5 owns is the surface it produces, not the deployment.

## 1. Scaffold

Frozen stack, verbatim — do not substitute a layer:

| Layer | Frozen choice |
|---|---|
| Hosting | Cloudflare Workers + Static Assets (`@cloudflare/vite-plugin`) + Wrangler 4 |
| Data | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |
| Front end | React 19 + TypeScript + Vite + TanStack Start (SSR) + TanStack Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Protection | Cloudflare Turnstile |
| Toolchain | Bun 1.4.x + Wrangler 4 |
| AI features | DeepSeek, called server-side; key held server-side |

**Prerequisites** — install and verify these before the first `bun create vite`. The toolchain
requires them, and none of the versions below are guesswork (CI pins the Supabase CLI):

| Tool | Version | Install | Check |
|---|---|---|---|
| Node.js | **22 LTS or newer** — the toolchain requires it (Vite, TanStack Start and Wrangler all build on it; `nodejs_compat` in `wrangler.jsonc` is not a substitute for it locally) | macOS: `brew install node@22`; Windows: installer from https://nodejs.org (LTS); Linux: `nvm install 22` | `node -v` → `v22.x` or newer |
| Bun | **1.4.x or newer** (the stack pins it) | `curl -fsSL https://bun.sh/install \| bash` (or `brew install bun`) | `bun -v` |
| git | any current release | `brew install git` (macOS) or your package manager | `git --version` |
| Supabase CLI | **2.115.0** — the version CI pins; a local/CI CLI mismatch breaks `supabase db push` | `brew install supabase/tap/supabase` (or `npm i -g supabase`) | `supabase --version` |
| Wrangler | **4.x** — the stack freezes Wrangler 4 (`AGENTS.md` §7) | none — run it through `bunx` (e.g. `bunx wrangler deploy`); no global or project install needed | `bunx wrangler --version` → `4.x` |

Verify before you start:

```sh
node -v && bun -v && git --version && supabase --version
```

Expect four version lines, with `bun` reporting 1.4.x.

Dependency set (exact; nothing more is required for the scaffold):

- Base: `react@19`, `react-dom@19`, `typescript`, `vite`, `@vitejs/plugin-react`.
- Routing/SSR: `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`.
- Hosting: `@cloudflare/vite-plugin`.
- Styling: `tailwindcss`, `@tailwindcss/vite`; shadcn/ui via `bunx shadcn@latest init`.
- Data: `@supabase/supabase-js`.
- Admin editor: TipTap (`@tiptap/react` and its starter extensions, added at Stage 3.4).

Steps:

1. `bun create vite` → choose the `react-ts` template.
2. Add the dependencies above.
3. `bunx shadcn@latest init`.
4. Write `.npmrc` with `registry=https://registry.npmjs.org/` (§1.1) and commit it — the file is
   part of the scaffold, not a local preference.
5. `vite.config.ts`: `react()`, `tailwindcss()`, `tanstackStart()`, `cloudflare()`, with the SSR
   environment configured.
6. `wrangler.jsonc`: worker name, `nodejs_compat`, and a `preview` environment (persistent
   `workers.dev`, `noindex`).
7. Generate the lockfile from the public registry and commit it with the project.

### 1.1 Dependency source hygiene — public registry only

**Rule: resolve every package from the public npm registry (`registry.npmjs.org`). Never ship a
lockfile that resolves through a private package mirror or a sandbox cache.**

Why: some AI/cloud scaffolds pin their lockfile to a private mirror that GitHub Actions runners
cannot reach. The first fresh `bun install --frozen-lockfile` in CI returns 403, so CI breaks
**silently**, and every dependency bump fails the same way (Dependabot included). The failure is
invisible locally, where the mirror is reachable.

Procedure:

1. Add `.npmrc` with `registry=https://registry.npmjs.org/`.
2. Delete and regenerate the lockfile.
3. Confirm `bun install --frozen-lockfile` is green **in CI**, not only locally.
4. All runtime deps are public. There is no reason to depend on a third-party mirror.

### 1.2 Scaffold gate

```sh
bun install --frozen-lockfile && bun run typecheck && bun run lint && bun run build
```

All four green, and `bun run dev` serves the app. The committed `.npmrc` pins the public registry; a
scaffold that ships without it is not complete. Do not start Stage 3.2 until this passes.

## 2. Data layer — gate only

**No DDL in this file.** The schema is frozen in `DATABASE_SCHEMA.md` and split by domain in
`references/schema/`. Load `references/schema/README.md` first for the domain map and load order,
then the domain you need — never the whole schema at once. Committed SQL migrations remain the
single source of truth.

| Need | Load |
|---|---|
| Profile domain tables | `references/schema/profile.md` |
| Content / KB tables + `ContentDoc` shape | `references/schema/content.md` |
| AI, cache, ops tables | `references/schema/ai-ops.md` |
| Roles, views, RPCs, grants, storage, edge-function matrix | `references/schema/access.md` |
| Seed rows and migration order | `references/schema/seeds.md` |
| RLS audit A–G | `references/schema/audit.md` |

Steps:

1. Turn the frozen schema into committed SQL migrations `supabase/migrations/NNNN_*.sql`.
2. Authenticate the Supabase CLI **before** linking: `supabase login --token <PAT>`. Without it,
   `supabase db push` fails with `Access token not found`. If `supabase link` prompts for the
   database password, supply it via `SUPABASE_DB_PASSWORD`.
3. `supabase db push` — every migration applies cleanly.
4. Create the admin account on the owner's email domain and set its `app_metadata` to
   `{"role": "admin"}` (`is_admin()` reads `auth.jwt() -> 'app_metadata' ->> 'role'`). Wire
   **Authentication → Hooks → Customize Signup** to `hook_restrict_signup_by_email_domain`; the
   `check_email_domain` BEFORE INSERT trigger enforces the domain even without the hook, but the
   real control is the one you set first: **`enable_signup = false`**, with the admin provisioned
   by hand and an immutable user-id allowlist checked beside `is_admin()` — domain restriction is
   defence in depth, not identity authorization (`DATABASE_SCHEMA.md` §1).
5. Populate the profile and content domains **through the admin surface** — the profile singleton,
   experiences, skills, gaps, recommendations, the private AI context (`values_culture`,
   `faq_responses`, `ai_instructions`) and the `cv_settings` row. Nothing renders until this data
   exists.
6. Prove the access model with a raw anon client, not with eyeballs.

Gate: migrations apply cleanly; **public read works** (public views and `get_public_*` RPCs return
data, not a permission error); **anonymous write is denied** on every table; the admin path works;
a foreign-domain signup is rejected. Keep the raw-client evidence — it is re-run at the Stage 6
audit.

## 3. Sections

Build only from the approved design system. No new sections, no copied layout.

Section list and order (home page):

1. Navigation
2. Spotlight — carries the "Ask AI about me" CTA
3. About
4. Skills matrix
5. Experience timeline
6. Testimonials / recommendations
7. Just-for-fun links
8. Disclaimer
9. Contact surface
10. Footer

The list above is the design's core-section set, and that is the order to build it. It is **not**
the runtime order: the `site_sections` registry seed is authoritative for the runtime order and
visibility of the registry-backed home sections. Its frozen keys — `spotlight`, `experience`,
`skills`, `jd`, `testimonials`, `transparency`, `disclaimer`, `footer`, `fun` — do not match this
list one-for-one (no `about`/`contact`; the seed adds `jd`/`transparency`), so defer to the seed and
never restate the section list as the runtime order. The seed values live in
`references/schema/seeds.md`.

Rules:

1. **Mobile-first.** Design at the narrow viewport, then widen. Every section must hold at desktop
   and mobile widths.
2. **Accessible.** Contrast AA, visible focus states, full keyboard navigation,
   `prefers-reduced-motion` respected.
3. **Approved design system only.** Tokens, type scale, spacing rhythm, motion and card style come
   from the approved design contract (`references/design.md`).

### 3.1 Deferred-section anchor rule — required

Heavy below-the-fold sections are lazy-mounted on scroll to keep the entry chunk small. That breaks
native `#hash` anchors and scroll-to-section links: the target element is not mounted yet, and
hydration can also swap out the server-rendered copy until the chunk loads. Result: a link to a
footer block (e.g. "Download CV", "Contact") only works after the page has been scrolled through.
**This bug reproduces only on first load after a fresh install** — it hides in warm navigations.

Wherever a section is deferred, the mechanism has two parts:

1. **Declare anchors.** Each deferred section declares the anchor ids it renders.
2. **Route the hash through a driver.** A small shared driver routes a hash (URL load or in-page
   link) to the owning section, **forces that section to mount immediately**, then scrolls once the
   element actually exists (e.g. a `MutationObserver`), **re-asserting after layout settles**.

Rule: route **every** scroll-to-section click through that driver. Never assume the element is
present. Verify on a cold first load, not after scrolling.

Gate: typecheck, lint and build green; browser check on desktop and mobile; every anchor reaches
its section on first load; the cold-load anchor test passes for every advertised anchor.

**Cold-load anchor test (required).** With the built site, for **every** advertised anchor id: open
`/#<anchor>` in a fresh browser context (empty cache, no prior scroll) and assert the target section
is mounted and in view within 2 s; then repeat each one as an in-page click from the top of the page.
Playwright/Puppeteer is enough — the point is a cold context, because a warm reload hides this bug.
The gate is not "typecheck green"; it is "every anchor landed on first load, on desktop and mobile
widths".

## 4. Content model and knowledge base

**Content is data, not JSX.** Collections, hubs and documents are typed data in Supabase behind
public read-only views. Pages, internal links and related links derive from the same source of
truth. Seeds exist only to populate an empty database.

### 4.1 Typed block model

Blocks admins can author: `p`, `h2`, `h3`, `list`, `steps`, `table`, `checklist`, `callout`,
`diagram`, and sanitized `rich` HTML. Runtime rendering is per block type — never
`dangerouslySetInnerHTML` on unsanitized content.

### 4.2 `ContentDoc` shape

`h1`, `label`, `description`, `intro`, `tags`, `related`, `faqs`, `blocks`. The JSONB shape and its
owning table are in `references/schema/content.md` (§6 of the source schema) — do not restate it
here. `slug` is a `content_docs` column, not a key in `doc`.

### 4.3 Collections, routes, admin

1. Create the collections the owner chose in the questionnaire. The reference has nine: `services`,
   `expertise`, `articles`, `experience`, `certifications`, `technologies`, `speaking`, `glossary`,
   `resources`.
2. Seed the first documents; runtime renders from the database, seeds do not ship as JSX.
3. Build hub and document routes with **server-side related-link resolution** — direct refs,
   backlinks and tag matches, ~6 limit. Navigation uses lightweight summaries, not full documents.
4. Build the admin surface:
   - TipTap WYSIWYG editor.
   - KB image library (public bucket, admin-only writes, 5 MB limit, MIME allow-list
     `png/jpeg/webp/gif` — **no SVG**, server-side filenames). The library states, in the admin UI,
     that **every upload is public**: the bucket serves object URLs to anyone holding them, so it
     carries publishable material only and non-public files belong in a private bucket behind signed
     URLs (`DATABASE_SCHEMA.md` §8).
   - Related-pages picker fed by the live catalog.
   - AI content helpers — tag generation, FAQ-label generation and content generation via the
     DeepSeek edge functions.
5. **Sanitize server-side.** A server-side HTML sanitizer runs on all rich content, with an
   allow-list (`<img>` over **https** only, no `data:` URIs, hosts limited to the CSP `img-src`
   allowlist — `http:` sources are mixed content and third-party origins are tracking pixels, so
   self-hosted objects are the default). Uploads are re-encoded server-side after the format is
   verified against the bytes, metadata is stripped, and pixel/decompression limits apply.

Gate: hub and document pages render from the database; admin create/edit/publish works; related
links resolve; the sanitizer strips `<script>`, `<img onerror=…>`, `javascript:` hrefs, `<iframe>`
and `data:` URIs.

## 5. Interactive features

### 5.1 AI chat and JD analysis

1. Edge functions call DeepSeek through the shared client `_shared/deepseek.ts`; the key comes from
   the **`deepseek`** secret via `Deno.env.get("deepseek")`. Never expose the key to the browser.
2. **Per-IP rate limits** via `check_rate_limit`, keyed on `cf-connecting-ip`: `chat` 30/15 min,
   `analyze-jd` 10/15 min — the platform-set header only; never read `x-forwarded-for` and never
   fall back to it (a request without the platform header fails closed; `DATABASE_SCHEMA.md` §9).
3. **Strict input validation** on every user-supplied field: **length caps and role caps** (a cap on
   each field's length, and each field constrained to the role the endpoint expects — no extra keys,
   no field-type swaps). **NFKC normalization** applied to user text before it reaches a prompt or a
   cache key; the reference calls `.normalize("NFKC")` explicitly, so match that call. **JSON-only
   bodies** — the 415 guard rejects non-JSON at the transport layer; the validation control itself is
   owned by `references/secure.md`.
4. **Response caching** — `chat_response_cache` for chat, `jd_analysis_cache` for JD analysis.
5. **No Turnstile** on `chat` or `analyze-jd` (ADR-0007); the compensating controls are the rate
   limits, input caps and caching.
6. Defend against prompt injection: delimit user content, instruct the model to ignore embedded
   instructions, forbid echoing the system prompt or the private AI context, cap output length.

### 5.2 CV download (Turnstile-gated)

1. Edge function `generate-cv`; Turnstile widget in the download dialog.
2. **Server-side `siteverify`** — never trust a client-side result. The endpoint accepts `GET`, `HEAD`
   and `POST`, and the Turnstile check runs on **every accepted method** — a `POST`-only guard leaves
   a `GET` bypass of the CV/abuse gate.
3. Diagnostics use hyphenated error codes: `no-token`, `no-secret`, `http-*`, `error-codes`. These
   four are enumerated here because `references/secure.md` documents only `invalid-input-response`;
   this file is their only owner — do not reduce them to a pointer.
4. **The challenge travels only in a `POST` body** — never a query string, where it would reach
   history, proxy logs, analytics and `Referer` headers. A verified `POST` mints a **short-lived,
   single-use signed download token**; `GET` and `HEAD` must present that token and are verified
   server-side, so no accepted method is unverified and no challenge is ever logged or cached.
   Missing, expired, reused or dummy credential → `403`, and downloads answer with
   `Referrer-Policy: no-referrer`. The endpoint is rate-limited across `GET`, `HEAD` and `POST`
   alike.
5. Content comes from `cv_settings` (headline, summary, achievements, keywords, certifications,
   education, notes, plus the admin-editable `creation_prompt` custom rules); the generated PDF is
   cached in `cv_documents`, keyed by a hash over the whole CV input (settings including
   `creation_prompt`, plus the profile and experience data the PDF embeds) so an admin edit can never
   serve a stale PDF; a `cv_settings` update also purges the cache (`DATABASE_SCHEMA.md` §7).

### 5.3 Edge-function inventory

All functions deploy `--no-verify-jwt` with the CORS allowlist and 405/415 guards. The DB access
matrix is in `references/schema/access.md` (§9 of the source schema).

| Function | Role | Access control |
|---|---|---|
| `chat` | AI chat about the owner | per-IP rate limit (30/15 min) |
| `analyze-jd` | Job-description fit analysis | per-IP rate limit (10/15 min) |
| `generate-cv` | Gated CV PDF | Turnstile `siteverify` |
| `generate-doc-content` | Admin content generation | JWT verify, admin |
| `generate-doc-tags` | Admin tag generation | JWT verify, admin |
| `generate-faq-labels` | Admin FAQ-label generation | JWT verify, admin |
| `translate-recommendation` | Writes `recommendations.recommendation_text_en` with `translation_reviewed = false`; the public view serves the translation only after an admin confirms it, plus `is_translated` | JWT verify, admin |
| `get-contact` | Public contact endpoint — profile-view fields only, never email or phone | public |
| `sitemap` | Dynamic `sitemap.xml` from the content catalog | public |
| `abuse-alert` | Scheduled watchdog, every 15 min via `supabase/config.toml`; thresholds from `ABUSE_*` secrets; writes `abuse_alerts` — `detail` carries aggregates only (counts, thresholds, windows, timestamps, function names), never question text, user content, IPs or PII; the optional webhook mirror follows the same rule | scheduled |

### 5.4 Admin-function authentication

The four admin functions (`generate-doc-content`, `generate-doc-tags`, `generate-faq-labels`,
`translate-recommendation`) deploy `--no-verify-jwt`, so each **must verify the caller's JWT
itself**: presence **and** signature via `auth.getUser()` against the service-role client. Decoding
the JWT without verifying the signature is **not** authentication. Full contract:
`references/secure.md` §3.

Ordering matters as much as the check: the `OPTIONS` preflight is the only response allowed before
auth — every other request runs the signature-verifying `auth.getUser()` before the method guard, the
body guard and any handler logic (`references/secure.md` §3).

Gate: for each of the four functions — no token → `401`; tampered/forged token → `401`; valid
non-admin token → `403`; admin token → works; plus the ordering cases: `OPTIONS` without a token
returns the preflight, and a tokenless non-`OPTIONS` request returns `401` even for an unsupported
method.

### 5.5 Seasonal banners

Recurring seasonal banners driven by the `holiday_banners` table, with dismissal logic. Seed rows
are in `references/schema/seeds.md`.

### 5.6 Threat model — read once

Rate limits, input caps, response caching and Turnstile protect against **abuse and excessive AI
use**, not against a determined attacker. The real security boundary is the **RLS model** (views,
grants, policies), which is why the final RLS audit is mandatory. Do not present the abuse controls
as attack protection.

Gate: wrong method returns `405` with `Allow`; non-JSON body returns `415`; bad tokens are rejected;
happy paths work end to end; admin functions reject missing, forged and non-admin tokens; AI
endpoints return `429` after a burst; no key material in the browser bundle (no `sk-`,
`sb_secret_` or `0x3…` shapes in `dist/`).

## 6. Build gates

Run every gate yourself and show the output. A failed gate stops the sub-stage — fix it or report
it; never proceed and mention it later.

| Sub-stage | Gate |
|---|---|
| Scaffold | `bun install --frozen-lockfile && bun run typecheck && bun run lint && bun run build` green; `bun run dev` serves the app; lockfile resolves from the public npm registry in CI; committed `.npmrc` pins `registry.npmjs.org` |
| Data layer | `supabase db push` applies cleanly; public read works; anonymous write denied; admin path works; foreign-domain signup rejected |
| Sections | typecheck, lint, build green; browser check on desktop and mobile; every anchor reaches its deferred section on first load; cold-load anchor test passes for every advertised anchor (fresh context, desktop + mobile) |
| Content model and KB | hub and document pages render from the database; admin create/edit/publish works; related links resolve; sanitizer strips disallowed markup |
| Interactive features | edge-function guards reject bad method (`405` + `Allow`) and bad body (`415`); Turnstile gate rejects missing (`403`) and dummy (`invalid-input-response`) tokens; rate limits enforced; admin functions reject missing (`401`), forged (`401`) and non-admin (`403`) tokens; no secret shapes in `dist/`; the CV cache key covers the whole CV input and a `cv_settings` edit purges the cached PDF |
| Security defaults | wired as part of the build, not after it — full header suite, CORS allowlist, secrets policy, CI secret and dependency scanning; any deviation recorded in an ADR. See `references/secure.md` |
| Identity | `enable_signup = false`; the admin provisioned by hand and present in an immutable user-id allowlist; account creation and role changes raise an alert |
| Production readiness | every row of `references/secure.md` §7 satisfied with its artifact, and the evidence list in `references/assurance.md` §2 complete — a release that cannot show the artifacts is not ready |

## Source map

| Section here | Old-kit source |
|---|---|
| §1 Scaffold | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1 (Scaffold), including the dependency-source hygiene / public npm registry rule; `GUIDE_FROM_SCRATCH.md` Step 7; stack frozen in `AGENTS.md` §7 |
| load order and progressive loading | `AGENTS.md` §8 (sub-stage loading rules) |
| §2 Data layer (gate only) | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 3 (Supabase schema + RLS); `GUIDE_FROM_SCRATCH.md` Step 8; DDL ownership stays with `DATABASE_SCHEMA.md` / `references/schema/` |
| §3 Sections | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 4 (Core sections), including the deferred-section anchor driver; `GUIDE_FROM_SCRATCH.md` Step 9 |
| §4 Content model and knowledge base | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 5 (Content collections + knowledge base); `GUIDE_FROM_SCRATCH.md` Step 10 |
| §5 Interactive features | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 (Interactive features), excluding the machine-readable routes, JSON-LD and SERP-meta material owned by `references/distribute.md`; `GUIDE_FROM_SCRATCH.md` Step 11 |
| §6 Build gates | `SKILL_INTERACTIVE_PORTFOLIO.md` per-phase gates (Phases 1–6) and `GUIDE_FROM_SCRATCH.md` Steps 7–11 `[Check]` blocks |
