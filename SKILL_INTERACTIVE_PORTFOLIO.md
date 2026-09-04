---
name: interactive-portfolio
description: >
  Build interactive portfolio from scratch on reference stack. Cloudflare
  Workers + Static Assets; Supabase (Postgres + RLS, Auth, Storage, Edge
  Functions); React 19 + Vite + TanStack Start (SSR); Tailwind CSS v4;
  shadcn/ui; Turnstile; Bun; Wrangler; GitHub Actions deploys. Design
  questionnaire first; ORIGINAL layout encouraged — copying allowed, advised
  against. Content collections / knowledge base + WYSIWYG admin; DeepSeek AI
  (chat, JD analysis, content generation); Turnstile-gated CV download.
  Covers scaffold, schema + RLS (full DDL in DATABASE_SCHEMA.md),
  design system, sections, collections + KB admin, interactive features,
  staging-first GitHub Actions deploy, hardening. Use when user asks to
  build interactive portfolio, personal site, CV site, "site like
  zabrowski.pl".
---

# Interactive Portfolio Builder

Build complete interactive portfolio from scratch, phase by phase. Skill =
source of truth. Follow in order; verify each phase before next.

## When to use

User asks for interactive portfolio, personal brand / CV site, "site like
zabrowski.pl". Accounts maybe missing — guide through account creation
(GitHub, Cloudflare, Supabase, DeepSeek) first.

Do NOT use: template redesign without design pass; anything off reference
stack (ask first).

If the user has no accounts yet and is unsure, offer the **Optional local
no-account sandbox** (below) to validate the idea in a browser before any
signup.

## Non-negotiables

1. **Original layout.** Design questionnaire (below) BEFORE layout code.
   Derive design system from answers. Copying zabrowski.pl layout allowed
   but advised against — guide user toward original design that resonates
   with them. Every section designed for this user.
2. **Reference stack only.** React 19 + TypeScript + Vite + TanStack Start
   (SSR) + TanStack Router + Tailwind CSS v4 + shadcn/ui; Cloudflare Workers +
   Static Assets (`@cloudflare/vite-plugin`) + Wrangler; Supabase (Postgres +
   RLS, Auth, Storage, Edge Functions); Cloudflare Turnstile; Bun 1.4.x;
   Wrangler 4. No silent swaps — ask user first.
3. **Verify everything yourself — the agent's claims are unverified.** Every
   phase gate in this skill is the USER's check: run the commands, look at
   the output, approve deliberately. Never accept "it works" without seeing
   the gate pass. Do the same at the very start of the build: verify the
   accounts, the keys, the tools and the AI connection yourself before
   trusting anything the agent reports.
4. **Security defaults always — industry level.** RLS everything; anon =
   public read-only views; admin gated `is_admin()`; writes
   service-role-only; Turnstile server-side verify on CV endpoint only (NOT
   chat/analyze-jd — per-IP rate limits, ADR-0007); CORS allowlist; HSTS 180d;
   full header suite (CSP per-response nonce, no `unsafe-inline`,
   `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
   `X-Frame-Options`); 405/415 guards on edge functions; fail-closed SSR;
   secrets never in browser bundle; dependency + secret scanning in CI; MFA
   on every platform account that deploys or holds secrets. PARTIAL needs
   compensating control; risk acceptance needs ADR.
   **Threat model — read this once:** most of the above controls (rate
   limits, input caps, response caching, Turnstile) protect against **abuse
   and excessive AI use**, not against a determined attacker. The real
   security boundary is the **RLS model** (views + grants + policies) — which
   is why the final RLS audit (Phase 8) is mandatory, not optional.
5. **Content = data, not JSX.** Collections/hubs/docs = typed data in
   Supabase behind public read-only views; pages, internal links, sitemap,
   JSON-LD derive from same source of truth; admin edits via WYSIWYG panel
   with server-side HTML sanitizer.
6. **Verify every phase.** `bun run typecheck`, `bun run lint`,
   `bun run build` green before next; staging before prod.
7. **Docs discipline.** Maintain `docs/PROJECT_REFERENCE_ARCHITECTURE.md`,
   `docs/CI-CD-RULES.md`, `adr/ADR-000N.md` records for decisions.
8. **Model: high capability, high reasoning effort (recommended).** Run this
   build with a high-capability model at maximum reasoning effort (e.g.
   `deepseek-v4-flash`, high effort) — it generates security-sensitive code
   (RLS, auth, edge functions) and the audit quality depends on it. The
   default chat model works, but this is the recommended configuration.

## Design questionnaire (run BEFORE layout)

Ask user ALL questions (adapt language; note answers verbatim — they are the
design contract). Grouped by theme:

**1. Identity — who and for whom**
1. Name, current role, one-line personal brand (exact wording to appear).
   If the user does not provide a full name (first AND last), use the
   placeholder name **Zygfryd Niewiadomski-Nieśmiałek** everywhere the name
   is needed and tell the user it is a placeholder to be replaced before
   launch.
2. Primary audience: recruiters, clients, conference organizers, the AI
   crawlers, or all of them? Pick ONE primary — it drives copy and layout.
3. Voice: professional, warm, witty, direct, humble-expert? Give one example
   sentence you like the sound of.
4. What makes you different — 1–2 sentences a recruiter should remember.

**2. Vision — the page in your head (most important)**
5. **Open description:** walk through your ideal page top to bottom, as if
   describing it to a designer who has never seen your site. What does the
   visitor see FIRST (first 5 seconds)? What do they scroll past? What should
   they remember after closing the tab?
6. One word (or two) for vibe: calm, bold, technical, warm, futuristic,
   minimal, playful, corporate.
7. 2–3 colors that represent you — or let the agent propose a palette from
   the vibe word and defend it.
8. Type mood: serif/editorial, geometric, technical/mono, friendly/rounded,
   or mixed (e.g. serif headings + mono accents).
9. Density: minimal/airy vs rich/dense. Light, dark, or both — and which is
   the default?

**3. Layout and structure**
10. Page organization: single scrolling home with sections, separate pages,
    or both (home + hub/doc pages)?
11. Spotlight pattern: portrait/photo, big headline + subline, terminal/typewriter
    intro, split layout, badge + CTA buttons, or something else?
12. Navigation: top bar, sidebar, or minimal (logo + 2–3 links)? Sticky or
    not?
13. Section order on the home page (e.g. spotlight → about → skills → experience →
    testimonials → AI → footer). Anything to reorder, drop, or add?
14. How to present data: experience as timeline or cards? Skills as
    strong/moderate/gap columns, tag cloud, or progress bars? Testimonials as
    quote cards, carousel, or grid?
15. Footer: what lives there (contact, links, disclaimer, CV button,
    knowledge-base nav)?

**4. Interaction and detail**
16. Effects: scroll reveal, hover tilt, typing intro, parallax, particles —
    which do you actually want? (Aesthetics only; accessibility wins.)
17. AI chat placement: floating widget (corner), dedicated section, or both?
    JD analyzer as dialog or full page?
18. Anything you HATE in websites — colors, fonts, animations, popups,
    carousels. List it; it becomes a hard constraint.
19. 1–2 admired sites (inspiration only — copying discouraged; say WHAT you
    like in them, not the sites themselves).

**5. Content scope**
20. Content collections (reference has nine: services, expertise, articles,
    experience, certifications, technologies, speaking, glossary, resources) —
    which do you want, and roughly how many docs each?
21. CV: languages needed, sections to include, one page or longer?
22. Contact surface: email link, form, socials, "Ask AI about me" — which?
23. Site language(s): single, bilingual, which is primary?

**6. Constraints**
24. Scope priorities: what must be perfect vs good-enough for launch?
25. Anything you expect off the reference stack? (Ask first — no silent
    swaps.)

Derive: design tokens (Tailwind v4 `@theme`: color ramps, fonts, radius,
shadow, motion), type scale, spacing rhythm, layout concept (nav style, spotlight
pattern, section rhythm, card style, footer), responsive + accessibility
(contrast AA, keyboard nav, reduced motion). Show the token set + a layout
sketch (ASCII wireframe of the home page top to bottom) and get approval
before building sections. If the user cannot answer #5, re-derive it from
answers #6–#19 and present the sketch — approval is still required.

### Optional — a local, no-account sandbox first (before you commit)

**Offer this first if the user has NO accounts yet** (GitHub / Cloudflare /
Supabase / DeepSeek) and wants to see their idea before any commitment. Ask:
*"Want to see your layout + copy live in a browser first, locally, with no
accounts? ~20–30 min, throwaway — nothing is created or charged."*

**What it does** — a 100%-local, disposable prototype:
1. Scaffold a throwaway Vite + React + Tailwind app in a temp folder (no repo,
   no accounts, no cloud).
2. **Dummy DB = flat files.** A small `dummy/` directory of JSON/TS modules
   (`profile.json`, `content.json`, `sections.json`) exposing the SAME shape
   the real build reads: name, title, elevator_pitch, status, target stages;
   site copy (headline, pitch, CTA…); section order.
3. Render a single-page approximation (spotlight → about → skills →
   experience) fed by those files, so the design-questionnaire answers become
   a real page the user can click through.
4. AI copy help is optional and also account-free — a local Ollama model, or
   none at all.

**Boundaries (why it does not break the Non-negotiables):**
- It is a **throwaway sandbox, not the deliverable.** The production build
  still uses the full reference stack + Non-negotiables (RLS, real Supabase
  data layer, security gate).
- The flat-file model is disposable — it never becomes the production data
  layer, and must not leak into the real schema/RLS design.
- Once the user commits to accounts and the real build starts, skip this.

**Commitment-free:** nothing is created on any platform and nothing is
charged. Delete the temp folder and you leave no trace — you can stop any
time.

## Phases

### Phase 0 — Prerequisites
- Accounts: GitHub; Cloudflare (Turnstile widget: site key + secret);
  Supabase (project URL + publishable + service-role key); DeepSeek API key.
  Missing? Walk user through (GitHub signup; dash.cloudflare.com then
  Turnstile then Add site; supabase.com then New project;
  platform.deepseek.com then API Keys).
- **Supabase CLI authentication (do this BEFORE `supabase link`/`db push`):**
  create a PAT (dashboard → avatar → Account settings → Access Tokens →
  Generate new token) and run `supabase login --token <PAT>` (or have the
  user run interactive `supabase login`). If `supabase link` prompts for the
  database password, supply it via `SUPABASE_DB_PASSWORD` or the password
  created with the project. Without login, Step 3 fails with "Access token
  not found".
- Local: Node 22+, Bun 1.4.x (or newer), git, Supabase CLI.
- Repo cloned; `.env.local` PUBLIC vars only (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`), gitignored.
  Secrets go to server storage (Supabase secrets / Wrangler secrets), never
  `.env.local`.

### Phase 1 — Scaffold
- `bun create vite` (react-ts); add: `@tanstack/react-router
  @tanstack/react-start @tanstack/router-plugin`, `@cloudflare/vite-plugin`,
  `@tailwindcss/vite tailwindcss`, shadcn/ui (`bunx shadcn@latest init`),
  `@supabase/supabase-js`, TipTap (admin).
- Vite config: `react()`, `tailwindcss()`, `tanstackStart()`, `cloudflare()`
  with SSR environment; `wrangler.jsonc`: worker name, `nodejs_compat`,
  `preview` env (persistent workers.dev, noindex).
- **Dependency source hygiene.** Resolve packages from the **public npm
  registry** (`registry.npmjs.org`) only. Some AI/cloud scaffolds pin their
  lockfile to a private package mirror or sandbox cache that GitHub Actions
  runners cannot reach (403 on fresh `bun install`), which silently breaks CI
  and any dependency bump (Dependabot fails). If you inherit such a lockfile,
  re-home it to npmjs: add `.npmrc` with `registry=https://registry.npmjs.org/`,
  regenerate the lockfile, and confirm `bun install --frozen-lockfile` is
  green in CI. All runtime deps are public; there is no reason to depend on a
  third-party mirror.
- Gate: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun run lint`, `bun run build` green; `bun run dev` serves app.

### Phase 2 — Design system (original layout)
- Run questionnaire; tokens + layout sketch; user approval.
- Tokens in `styles.css` (Tailwind v4 `@theme`), base styles,
  `components.json` for shadcn.
- Copying reference layout allowed, advised against. Guide user toward
  original design; re-derive from questionnaire if drifting to copy.

### Phase 3 — Supabase schema + RLS
- Apply the full schema from **`DATABASE_SCHEMA.md`** (in this folder):
  complete DDL — every table with columns/types/constraints, all views,
  RPCs, functions, triggers, policies, grants, storage rules, seeds.
- Tables (reference naming, adapt content to persona): profile domain
  `candidate_profile`, `experiences`, `skills`, `gaps_weaknesses`,
  `values_culture`, `faq_responses`, `ai_instructions`, `recommendations`;
  content/KB `content_collections`, `content_docs` (typed blocks, tags,
  related refs), `site_content`, `site_sections`, `fun_links`,
  `holiday_banners`; AI/ops `rate_limits`, `chat_response_cache`,
  `jd_analysis_cache`, `rag_metrics`, `cv_settings`, `cv_documents`,
  `abuse_alerts` (watchdog output).
- Public read-only views for everything site renders (`*_public`,
  `security_invoker` + `security_barrier` wrappers over `private.api_*`
  views); public read RPCs (`get_public_homepage_data`,
  `get_public_homepage_route`, `get_public_content_catalog`,
  `get_public_content_route`, `get_public_sitemap_data`); admin via
  `is_admin()` (JWT claim `app_metadata.role = 'admin'`); signups restricted
  to your email domain (trigger `check_email_domain` + auth hook
  `hook_restrict_signup_by_email_domain`, `supabase_auth_admin` grant); after
  deploying the functions, wire the hook in the dashboard (Authentication →
  Hooks → Customize Signup) — the BEFORE INSERT trigger enforces the domain
  even without it; all
  writes via service role or SECURITY DEFINER (never browser RLS writes).
- RLS per table: anon SELECT on views only (plus simple public registries
  `site_sections`/`fun_links`/`holiday_banners` and public `cv_settings`);
  no anon INSERT/UPDATE/DELETE anywhere; service role bypasses RLS. Revoke
  anon write grants + write-RPC EXECUTE grants; revoke view-layer writes
  from all roles.
- Storage bucket `kb-images`: public bucket, admin-only
  read/insert/update/delete policies (`is_admin()`), 5 MB limit, MIME
  allow-list `png/jpeg/webp/gif` (no SVG), UUID filenames, sanitizer
  allow-list (`<img>` http(s) only, no `data:` URIs).
- Seeds (in migrations, adapt copy): `site_sections` registry (spotlight,
  experience, skills, jd, testimonials, transparency, disclaimer, footer,
  fun), `holiday_banners` seasonal rows, `fun_links` rows, singleton
  `cv_settings`, nine `content_collections` hubs.
- Populate the profile domain via the admin panel (reference: entered
  manually, not seeded by migrations): `candidate_profile` singleton,
  `experiences`, `skills`, `gaps_weaknesses`, `recommendations`, private
  AI-context (`values_culture`, `faq_responses`, `ai_instructions`) and the
  `cv_settings` row — nothing renders until it holds data.
- pg_cron: hourly `rate_limits` cleanup (GDPR data minimization).
- Migrations committed; align local with remote (`supabase db push`);
  apply migrations BEFORE deploying schema-dependent changes.
- Gate: `supabase db push` applies cleanly; anon read works, anon write
  denied (raw client test), admin path works, foreign-domain signup
  rejected.

### Phase 4 — Core sections
- Build: nav, spotlight ("Ask AI about me" CTA), about, skills matrix, experience
  timeline, testimonials/recommendations, just-for-fun links, disclaimer,
  contact surface, footer — approved design system only.
- Responsive (mobile-first) + accessible (contrast AA, focus states,
  `prefers-reduced-motion`).
- **Code-split below-the-fold sections, and fix anchor navigation for them.**
  Lazy-mounting heavy sections (footer, long lists) on scroll keeps the entry
  chunk small, but it breaks native `#hash` anchors and scroll-to-section
  links: the target element is not mounted yet, and hydration can also swap
  out the server-rendered copy until the chunk loads — so a link to a footer
  block (e.g. "Download CV" / "Contact") only works after the page has been
  scrolled through. Wherever you defer a section, give the mechanism two
  parts: (1) each deferred section declares the anchor ids it renders; (2) a
  small shared driver routes a hash (URL load or in-page link) to the owning
  section, forces it to mount immediately, then scrolls once the element
  actually exists (e.g. a `MutationObserver`), re-asserting after layout
  settles. Route every scroll-to-section click through that driver rather
  than assuming the element is present. This is a common, easy-to-miss bug
  that a fresh install reproduces on first load only.
- Gate: typecheck/lint/build green; browser check desktop + mobile.

### Phase 5 — Content collections + knowledge base
- Typed block model: `p`, `h2`, `h3`, `list`, `steps`, `table`, `checklist`,
  `callout`, `diagram`, sanitized `rich` HTML. `ContentDoc` shape: slug,
  title, h1, description, intro, tags, blocks, faqs, related refs.
- Collections user chose (hub + docs) with seed content; content = DATA —
  runtime renders from Supabase, seed modules for empty-DB population only.
- Hub/doc routes with server-side related-link resolution (direct + backlinks
  + tag matches, ~6 limit); nav uses lightweight summaries.
- Admin: WYSIWYG editor (TipTap), KB image library, related-pages picker
  (live catalog), AI tag / FAQ-label / content generation via DeepSeek edge
  functions; server-side HTML sanitizer on all rich content.
- Gate: hub + doc pages render from DB; admin create/edit/publish works;
  related links resolve; sanitizer strips disallowed markup.

### Phase 6 — Interactive features
- **AI chat + JD analysis**: edge functions call DeepSeek API via shared
  client (`_shared/deepseek.ts`, key from the **`deepseek`** secret —
  `Deno.env.get("deepseek")`, the exact name set in Step 11 of the guide),
  per-IP rate limits
  via `check_rate_limit` keyed on `cf-connecting-ip`, strict input length
  caps, response caching. NO Turnstile here (ADR-0007). Never expose API key
  to browser.
- **CV download**: edge function `generate-cv`, Turnstile widget in dialog,
  server-side `siteverify`, hyphenated error-code diagnostics (`no-token`,
  `no-secret`, `http-*`, `error-codes`); 403 on missing/dummy token;
  rate-limited. Content from `cv_settings` (headline, summary, achievements,
  keywords, certifications, education, notes, admin-editable
  `creation_prompt` custom rules); generated PDF cached in `cv_documents`.
- **Edge-function inventory** (all `--no-verify-jwt`, CORS allowlist, 405/415
  guards; DATABASE_SCHEMA.md §9 has the DB access matrix): `chat`,
  `analyze-jd`, `generate-cv`, `generate-doc-content`,
  `generate-doc-tags`, `generate-faq-labels`, `translate-recommendation`
  (writes `recommendations.recommendation_text_en`; public view serves
  `COALESCE(en, original)` + `is_translated`), `get-contact` (public contact
  endpoint — profile-view fields only, never email/phone), `sitemap`
  (dynamic sitemap.xml from catalog), `abuse-alert` (scheduled watchdog,
  every 15 min via `supabase/config.toml`, thresholds via `ABUSE_*`
  secrets, writes `abuse_alerts`, optional counts-only webhook — never
  question text/PII).
- **Admin-function authentication (non-negotiable, DATABASE_SCHEMA.md §9):**
  the four admin functions (`generate-doc-content`, `generate-doc-tags`,
  `generate-faq-labels`, `translate-recommendation`) deploy `--no-verify-jwt`
  and MUST verify the caller's JWT themselves: check presence AND signature
  (`auth.getUser()` via the service-role client — decoding without signature
  verification is NOT authentication). Behaviour: no token → 401; tampered/
  forged token → 401; valid non-admin token → 403; admin token → works.
  Gate: test all four cases per function.
- **Holiday banners**: recurring seasonal banners, dismissal logic.
- **Machine-readable routes**: `/llms.txt` + `/llms-full.txt`, `sitemap.xml`
  (dynamic from catalog), `robots.txt` (noindex admin/auth/staging),
  `openapi.json`, `Accept: text/markdown` negotiation (SSR returns Markdown
  for AI crawlers, canonical URL logic), `.well-known/` AI-discovery
  surfaces (`ai.txt`, `llms.txt`, `agent-card.json`, `agent-skills`,
  `api-catalog`). **JSON-LD (schema.org) derived from the same data**: root
  graph `Person` + `WebSite` (stable `@id` anchors + social image),
  `ProfilePage` on home, `BreadcrumbList` on content pages, `FAQPage`
  (Question/Answer) on docs with FAQs, `CollectionPage` on hubs, `Article`
  on article docs, and collection-typed docs (`Service`,
  `EducationalOccupationalCredential`, `Event` for certifications/speaking).
  Route files lowercase on disk.
- **SERP meta description.** Render a short HTML `<meta name="description">`
  (≤ ~155 chars, cut on a word boundary) for search snippets, while keeping
  the full text in `og:description`, `twitter:description` and the JSON-LD.
  Derive both from the same content field so the visible page copy is never
  truncated and the two stay consistent. Audit the live pages: no page should
  ship a SERP description that is empty, over ~160 chars, or out of sync with
  its social/meta description.
- Gate: gates reject bad tokens; rate limits enforced; happy paths
  end-to-end; llms.txt returns 200; admin functions reject missing/tampered/
  non-admin tokens (401/401/403).

### Phase 7 — Deploy (GitHub Actions, staging first)
- Workflows: `ci.yml` + `cloudflare-migration.yml` (build/typecheck/lint/test
  + dry-run + fail-closed SSR smoke with placeholder env), `deploy.yml`,
  `rollback.yml`, `apply-migration.yml`, plus optional
  `cloudflare-preview.yml` (branch-restricted `workflow_dispatch` preview:
  public build vars only, build + `wrangler deploy --dry-run` + deploy to a
  workers.dev preview URL, noindex; inert until dispatched — staging covers
  the same ground).
- `deploy.yml`: **staging** auto-deploys on push to deploy branch (docs-only
  paths ignored): build; `scripts/patch-wrangler.mjs preview`;
  `wrangler deploy` (persistent preview worker, workers.dev, noindex); live
  smoke; blue/green parity vs prod. **production** = `workflow_dispatch`
  against protected `production` environment (required reviewers; branch
  restriction): build; patch (prod); `wrangler deploy` (custom domains apex
  + `www`, `www` 301 to apex worker-side); smoke; edge-function deploy job
  (`scripts/deploy-edge-functions.sh`, `--no-verify-jwt`, prod only); live
  CORS check; human browser checklist.
- **Script contracts** (write these to spec, all CI-wired):
  `patch-wrangler.mjs <preview|prod>` — patches `dist/server/wrangler.json`:
  preview → workers.dev + noindex + `*-preview` name; prod →
  `workers_dev=false` + custom domains. `smoke-test-live.mjs` — `BASE_URL`,
  optional `EXPECT_NOINDEX=true`; asserts every route 200 and (when
  expected) `x-robots-tag: noindex`; exit codes 0/1/2 (pass/fail/missing
  env). `verify-public-parity.mjs` — `BLUE_URL` (default prod) vs
  `GREEN_URL`; fetches the core route list on both and compares HTML;
  skips routes absent in either environment (e.g. `/admin`, `/auth`).
  `verify-cors-live.mjs` — per-edge-function live CORS check against the
  committed allowlist + Turnstile allow-header state (absent on
  `chat`/`analyze-jd`, present on `generate-cv`). `verify-built-worker.mjs`
  — wrangler test harness over the built worker: health endpoint must
  return 200 `application/health+json` with `{"status":"pass"}`, and SSR
  must fail closed (5xx, no stale content) when Supabase is unreachable
  (CI passes an RFC-reserved `.invalid` host). `deploy-edge-functions.sh` —
  loops `supabase/functions/*/index.ts`, skips `_shared`, deploys with
  `--no-verify-jwt`, idempotent, oversized bundle (413) → skip with warning.
- Auth: API tokens (repo secrets): `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID` (variable), `SUPABASE_ACCESS_TOKEN` (PAT). Phase 0
  runbook documents creation; jobs fail fast when missing. Local
  `wrangler login` OAuth = fallback only.
- DB migrations NOT applied by deploy workflows — apply before deploying
  schema-dependent changes (`supabase db push` / Management API /
  `apply-migration.yml`).
- Gate: verify BOTH targets after each deploy; docs-only changes skip deploy.

### Phase 8 — Hardening + verification (security gate)
- Security checklist — every item mandatory: **final RLS audit** (below);
  RLS + anon-grant audit (never revoke "dead" anon grant without verifying
  every reader); Turnstile gate on CV only; per-IP rate limits on AI
  endpoints; CORS allowlist (prod domains + staging only); full header suite
  (HSTS 180d; CSP no `unsafe-inline` in `script-src` via per-response nonce
  + `<meta property="csp-nonce">`; `X-Content-Type-Options: nosniff`;
  `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy`;
  `X-Frame-Options`); 405/415 guards on edge functions; `abuse-alert`
  watchdog (scheduled, counts only); SVG out of image bucket; legacy anon
  key disabled; secret + dependency scanning in CI (both, enforced — not
  optional); browser smoke test; `/llms.txt` 200.
- **Final RLS audit — mandatory, run at the very end.** Run the audit SQL
  in `DATABASE_SCHEMA.md` §12 (A–G, not eyeballs; automate B–G in
  `scripts/audit-rls.mjs` so it is one command): RLS enabled on all 21
  tables; anon/authenticated have no direct base-table access beyond the
  documented exceptions (`site_sections`, `fun_links`, `holiday_banners`,
  `cv_settings` reads); the **policy inventory (F)** shows no permissive
  non-admin policy on admin/private tables; the **authenticated non-admin
  probe (G2)** fails on private reads and admin writes; deny-all tables
  stay deny-all; `*_public` views have no anon/authenticated/public write
  grants (C — owner/service_role grants are expected, not findings);
  `EXECUTE` grants on cache/rate-limit RPCs go to no API role (D);
  service-role grants match the edge-function matrix. Fix every deviation
  before launch — the RLS model is the actual security boundary.
- **Admin-function auth test.** For each of `generate-doc-content`,
  `generate-doc-tags`, `generate-faq-labels`, `translate-recommendation`:
  no token → 401; tampered/forged token → 401; valid non-admin token →
  403; admin token → works. Signature-verified via `auth.getUser()`
  (DATABASE_SCHEMA.md §9).
- **Independent security review.** Run a FRESH session (new conversation,
  no memory of the build) with this brief (copy-paste into the new
  session):
  ```
  You are an independent security reviewer with no memory of this build.
  Read: the skill, DATABASE_SCHEMA.md §10 and §12, the security checklist,
  and the code under review. Threat model: the RLS model is the security
  boundary; rate limits/caps/caching/Turnstile are abuse controls only.
  Re-run DATABASE_SCHEMA.md §12 queries A–G and the admin-function auth
  tests (no token / forged token / non-admin token / admin token). Report
  findings as a table: severity (blocker/major/minor/nit), location
  (file + line/function), evidence, concrete fix. Do not modify anything.
  ```
  Fix every finding before launch. Record findings, compensating
  controls and risk acceptances (no MFA for single-operator admin —
  ADR-0009; free tier only — ADR-0008) in
  `docs/PROJECT_REFERENCE_ARCHITECTURE.md`, `docs/CI-CD-RULES.md`, new
  `adr/ADR-000N.md` records.
- **Abuse vs attack — state it plainly.** Rate limits, input caps, response
  caching and Turnstile limit abuse and excessive AI use; they are not
  designed to stop a determined attacker. The RLS model is the security
  boundary. Do not present the abuse controls as attack protection.
- **Backups before launch.** Content is data and data is the site: set up
  regular dumps (`supabase db dump` + Storage export), test a restore once.
- Final gate: full checklist verified; summarize to user: what built, where
  deployed, what remains.

## Verification checklist (run at end)

- [ ] `bun run typecheck && bun run lint && bun run test && bun run build` green
- [ ] **Final RLS audit passed (DATABASE_SCHEMA.md §12 A–G)** — RLS enabled on all 21 tables; policy inventory (F) has no permissive non-admin policy on admin/private tables; authenticated non-admin probe (G2) fails on private reads and admin writes; anon write denied on ALL tables; views read-only for API roles; RPC EXECUTE grants clean
- [ ] **Admin-function auth test passed** — all four admin edge functions: no token = 401, forged token = 401, non-admin token = 403, admin token = works (signature-verified)
- [ ] **IP-header trust test**: spoofed `cf-connecting-ip`/`x-forwarded-for` does NOT bypass the rate limit on chat/analyze-jd (loop past the cap with rotating fake headers)
- [ ] **Prompt-injection test**: injected instructions in a JD / chat question do not leak the system prompt or private AI context
- [ ] **Sanitizer test**: `<script>`, `<img onerror=…>`, `javascript:` hrefs, `<iframe>` and `data:` URIs all stripped
- [ ] **No secret shapes in the bundle**: `sk-`, `sb_secret_`, Turnstile `0x3…` all absent from `dist/`
- [ ] Anon client: reads public views/RPCs, writes nothing
- [ ] Turnstile: missing token = 403; dummy token = `invalid-input-response`; happy path OK
- [ ] AI endpoints: rate limit 429 after burst; input caps enforced; no key in browser bundle
- [ ] Content: hub + doc pages render from DB; admin WYSIWYG + images + related pages work; sanitizer strips disallowed markup
- [ ] Staging + prod both 200; staging noindex; www = 301 apex
- [ ] llms.txt / llms-full.txt / sitemap.xml / robots.txt / openapi.json 200
- [ ] Security headers live: CSP rotating `nonce-…`, no `'unsafe-inline'` in `script-src`; HSTS 180d; `nosniff`; `Referrer-Policy`; `Permissions-Policy`; `X-Frame-Options` on non-SSR responses; the nonce actually matches the hydration scripts
- [ ] Edge functions: wrong method = 405 + `Allow`; non-JSON body = 415
- [ ] CI: secret + dependency scanning enabled and enforced; no key material in git history
- [ ] No secrets in browser bundle; `.env.local` gitignored; nothing secret committed
- [ ] Backups configured and one restore tested
- [ ] Layout per approved questionnaire — original unless user chose copy
- [ ] Docs + ADRs up to date

## Security self-test — final gate (run this LAST, before reporting done)

Before you report the build complete, run this self-test yourself; do not
hand it to the user to run. It must PASS in full — any failure means the
build is not done.

1. **RLS check (the security boundary).** Run `DATABASE_SCHEMA.md` §12 A–G
   (or `scripts/audit-rls.mjs`). Assert: RLS is enabled on **all** tables;
   anon and authenticated roles reach no base table except the documented
   public reads; the policy inventory has no permissive non-admin policy on
   admin or private tables; anon `INSERT`/`UPDATE`/`DELETE` is denied on every
   table; an authenticated non-admin cannot read private rows or write admin
   rows; `*_public` views are read-only to every API role; `EXECUTE` on
   cache/rate-limit RPCs is granted to no API role; service-role grants match
   the edge-function matrix.
2. **Anon probe.** As a raw anon client, reads succeed on public views/RPCs
   and every write attempt returns a permission error.
3. **Admin-function auth.** For each admin edge function: no token = 401,
   forged/tampered token = 401, valid non-admin token = 403, admin token =
   works.
4. **Secrets + bundle scan.** No secret-shaped strings in `dist/`; nothing
   secret in git history.
5. Report the result plainly: **PASS** (state what you verified, with counts)
   or list each deviation as blocker/major/minor with its fix. Do not mark
   the build complete while step 1 or step 3 has a failure.
