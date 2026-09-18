# references/pitfalls.md — traps paid for in production

Every entry below failed on the reference project (`zabrowski.pl`) or was recorded in the old kit
because it cost a production cycle once. They are cheap to avoid and expensive to rediscover. Read
this before the scaffold, before the sections, before the security gate.

## How to read an entry

Each entry has four parts:

- **Symptom** — what the owner or the user sees.
- **Cause** — the actual mechanism, not the first plausible one.
- **Fix** — the change that closed it on the reference.
- **Check** — the check that would have caught it earlier, or the honest statement that no local
  check caught it and what now does.

`Origin:` names the source. **`field log`** = the workspace field log
`AGENT_BOARD.md` (a live production site on this stack, outside this repo, read-only). **`old kit`**
= `GUIDE_FROM_SCRATCH.md`, `SKILL_INTERACTIVE_PORTFOLIO.md`, `DATABASE_SCHEMA.md`. When an
incident is in both, both are named.

Sibling references are cited by path only, and this document makes no claim about whether they
exist.

---

## A. iOS Safari keyboard and zoom

This is the most expensive cluster on the reference: six production deploys in one session, most of
them a fix for the previous fix. The order below is the order the team paid it in.
Read A1 first, then the wrong-fix ladder A2–A4 so you do not walk it again.

### A1. iOS auto-zooms any focused text input under 16px

- **Symptom.** On iOS Safari, focusing the chat input (or the public CV download email input)
  zooms the whole page: the drawer enlarges and the send button drifts off-viewport. It persisted
  after the earlier keyboard and overflow fixes had shipped.
- **Cause.** iOS Safari auto-zooms the viewport when a focused text input has a computed
  `font-size` below 16px. The chat input and the public CV email input were `text-sm` (14px). The
  base `ui/input` component was already `text-base`, so only the two explicit overrides were
  wrong.
- **Fix.** Every focusable text control is `text-base` (16px) minimum: `input`, `textarea`,
  `select`, rich-text/contenteditable. Bump the explicit `text-sm` overrides; do not rely on the
  shadcn base to survive a local override.
- **Check.** In the browser (or Playwright mobile emulation) assert
  `getComputedStyle(el).fontSize === "16px"` for every text input on every route that has one,
  including dialogs and the drawer. The reference added exactly this assertion (chat input
  computed `font-size=16px`) — but only after the bug.
- **Origin.** field log 2026-09-02 13:08, commit `98f7ad9`; persisted as the true cause after A2–A4
  failed.

### A2. Wrong fix — global `interactive-widget=resizes-content` broke the whole mobile view

- **Symptom.** The user reports the entire mobile view is broken immediately after deploy
  (`cały mobile view broken`). Keyboard-open resized the whole page, not just the drawer.
- **Cause.** The viewport meta was changed globally in `__root` to
  `interactive-widget=resizes-content` to make the keyboard shrink the layout. It resizes the whole
  page on keyboard open, which was worse than the original complaint.
- **Fix.** Revert the meta (`__root` restored); scope the drawer to `visualViewport.height` only
  while the input is focused. A per-component problem must not be solved with a global viewport
  meta.
- **Check.** No local check caught it: the fix passed local Playwright 7/7 and shipped, and the
  regression was reported by the user. The check that would have caught it is a real-device (or
  WebKit mobile) pass with the keyboard open before dispatch, plus a served-meta assertion after
  deploy. The reference now verifies the served meta is clean and runs a mobile overflow audit at
  320/375/390.
- **Origin.** field log 2026-09-02 12:10 (shipped `1844dcc`) → 12:20 REGRESSION (reverted `c059005`).

### A3. Wrong fix — `overflow-x: clip` on `html`+`body` triggers WebKit bug 150715

- **Symptom.** iOS Safari renders the page "too large" and the user must pinch out; the chat
  keyboard appears dead. This replaced A2's regression.
- **Cause.** `overflow-x: clip` on `html` plus `body` triggers WebKit bug 150715 — excessive
  enforced zoom when the body has `overflow: hidden`. The clip was redundant: the real overflow
  source had already been fixed with hero `text-balance` plus wrapping.
- **Fix.** Remove `overflow-x: clip` from `html` and `body`. Fix the actual overflowing element and
  verify zero overflow without any root clip in **both** Chromium and WebKit.
- **Check.** Serve the built CSS and assert no root `overflow-x: clip`; run the overflow audit at
  390px in Chromium **and** WebKit. Playwright Chromium-only checks passed while WebKit (the engine
  iOS actually uses) failed — engine coverage is the check.
- **Origin.** field log 2026-09-02 12:35, commit `003cee6`.

### A4. Wrong fix — `top: 0` plus `height = visualViewport.height` pushes the drawer off-screen

- **Symptom.** On iPhone, when the keyboard opens, the drawer header and input vanish entirely
  (user screenshot).
- **Cause.** The drawer was pinned at `top: 0` with `height = visualViewport.height`. iOS scrolls
  the visual viewport (`visualViewport.offsetTop`) to reveal the focused input, which pushes the
  fixed panel up out of the visible area. `visualViewport.height` alone is not the visible region
  once `offsetTop` is non-zero.
- **Fix.** Make the drawer full-screen (`inset-y-0`) so it never moves, and pad the bottom by the
  keyboard height: `max(0, innerHeight - visualViewport.height - visualViewport.offsetTop)`; the
  input row lifts above the keyboard.
- **Check.** Playwright assertion on the mobile viewport: panel full-screen (`headerTop = 0`),
  `paddingBottom = 344px`, `sendBottom = 488 <= 500` at a `visualViewport.height` of 500. Include
  `offsetTop` in the keyboard-height math — the reference test that passed before this bug did not.
- **Origin.** field log 2026-09-02 12:48, commit `82bf77e`.

### A5. Horizontal overflow re-triggers iOS enforced zoom

- **Symptom.** A long user message bubble overflows the right edge and the send button disappears
  again (iPhone screenshot) — the A1 zoom, re-triggered.
- **Cause.** Horizontal overflow triggers iOS enforced zoom. A long unbreakable token, plus flex
  children without `min-w-0`, made the bubble wider than the viewport.
- **Fix.** Drawer `overflow-hidden`; messages scroller `overflow-x-hidden`; `break-words` and
  `min-w-0` on bubbles and markdown content; `min-w-0` + `shrink-0` on the input form.
- **Check.** Render a 400-character unbreakable token and assert
  `scrollWidth === clientWidth` on the scroller (reference: `389 === 389`), no element exceeds the
  viewport, and the send button is within bounds (`right = 378`, `bottom = 832`). Add this to the
  mobile audit for any message or card list that accepts user text.
- **Origin.** field log 2026-09-02 12:58, commit `9542a7c`.

> **Ladder warning.** A2, A3 and A4 were each a fix for the previous symptom and each created the
> next one. Ship the A1 font-size fix first: it is the root cause of the "zoom" family. If it is
> still zooming after that, the remaining cause is horizontal overflow (A5), not the viewport meta.

---

## B. Deferred-section anchors

### B1. Lazy-mounting below-the-fold sections breaks `#hash` links on first load

- **Symptom.** A `#hash` link (or an in-page scroll-to-section link) to a below-the-fold section
  does nothing on first load. A "Download CV" or "Contact" link in the footer only works after the
  user has scrolled through the page. Reproduces on first load only, and never on a warm reload.
- **Cause.** Code-splitting heavy sections (footer, long lists) keeps the entry chunk small but the
  target element is not mounted when the browser tries to scroll to the hash. Hydration can also
  swap the server-rendered copy until the chunk loads, so the anchor is momentarily absent even
  when it was server-rendered.
- **Fix.** Two parts, both mandatory: (1) each deferred section declares the anchor ids it renders;
  (2) a single shared driver routes a hash — from a URL load **or** an in-page click — to the owning
  section, forces it to mount, and scrolls once the element actually exists (e.g. a
  `MutationObserver`), re-asserting after layout settles. Route every scroll-to-section click
  through that driver instead of assuming the element is present. The reference's "real fix" was
  exactly this: registry plus driver, with registry-aware scroll helpers.
- **Check.** Cold-cache first-load test: open `/#<anchor>` in a fresh browser context (empty cache,
  no prior scroll), assert the target section mounted and scrolled into view. Run it for every
  advertised anchor, and again as an in-page click. Playwright warm-reload checks do not catch it.
- **Origin.** field log 2026-09-02 12:52 (prod `bb27c8f`, registry+driver); old kit
  `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 4 (deferred-section anchor paragraph, backported in
  `0ab76c6`); `AGENTS.md` §Stage 3 step 3.

---

## C. Dependencies, build and routes

### C1. Lockfile pinned to a private mirror breaks CI with 403 on fresh install, silently

- **Symptom.** CI (and Dependabot) fails on a fresh `bun install` with `403` against a host the
  runner cannot reach. It also silently blocks every dependency bump.
- **Cause.** An AI/cloud scaffold wrote the lockfile against a private package mirror or a sandbox
  cache. All runtime dependencies are public; there was never a reason for the mirror.
- **Fix.** Add `.npmrc` with `registry=https://registry.npmjs.org/`, regenerate the lockfile, and
  confirm `bun install --frozen-lockfile` is green in CI. On the reference the re-home rewrote
  `bun.lock` from the private mirror to npmjs (207 URLs) and carried the pending bumps:
  `vite-plugin` 1.54.1, `wrangler` 4.127.0, TipTap family 3.30.5 (a core security fix). The superseded
  dependency PRs were closed.
- **Check.** Grep the lockfile for every non-`registry.npmjs.org` host before the first push, and
  run `bun install --frozen-lockfile` in a clean CI job that has no local cache. Fail the job on a
  single foreign host.
- **Origin.** field log 2026-09-02 13:08, commit `666394f`; old kit
  `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1 (dependency-source-hygiene paragraph); `AGENTS.md`
  §Stage 3 step 1.

### C2. Route filenames must be lowercase on disk

- **Symptom.** A machine-readable route silently disappears. An uppercase `LLMS[.]txt.tsx` makes the
  route generator drop `/llms.txt`; the file exists, the page does not.
- **Cause.** The route generator's case handling drops the mixed/upper-case filename.
- **Fix.** Lowercase route filenames on disk (`llms.txt.tsx`, and the same for every static
  machine-readable route).
- **Check.** After every build, `git diff src/routeTree.gen.ts` and confirm the expected routes were
  added. Then probe `/llms.txt` and `/llms-full.txt` for `200`.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 14; `AGENTS.md` §Stage 5 (route filenames
  lowercase on disk).

### C3. A build without the public env vars produces a broken worker

- **Symptom.** The worker builds and deploys but throws at runtime; the config module fails when
  `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing.
- **Cause.** The SSR config module requires the public env vars at import/build time and does not
  degrade.
- **Fix.** Keep `.env.local` in place locally (public vars only); CI sets placeholder values so the
  build step has them.
- **Check.** A CI build job that asserts the vars are non-empty before `bun run build`, plus one
  request against the deployed preview (not just a green upload). A build that only uploads static
  assets proves nothing about SSR.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 14.

### C4. Two sitemap generators drift; canonical URLs 307 instead of 200

- **Symptom.** `sitemap.xml` lists URLs that redirect (307) instead of serving 200, and the staging
  and production sitemaps disagree.
- **Cause.** Both the worker SSR and an edge function generated a sitemap from different data;
  trailing-slash / canonical rules were applied in only one of them.
- **Fix.** Single source: the worker SSR generator only; remove the edge-function sitemap; make
  canonical URLs explicit (`/terminal/`, `/angband/`) with the correct priorities and `lastmod`.
- **Check.** Fetch every URL in `sitemap.xml` and assert `200` with no redirect; diff
  `sitemap.xml` between production and staging. The reference verified 103 URLs, zero bare paths,
  zero duplicates, prod == staging.
- **Origin.** field log 2026-09-02 11:20 (commit `7c8f2f9`) and 11:19 (sitemap verification).

---

## D. Security surfaces

### D1. A CSP nonce that never matches the hydration scripts

- **Symptom.** The CSP header looks correct (`script-src 'nonce-…'`, no `'unsafe-inline'`), but the
  inline hydration scripts do not carry the nonce. The policy is either bypassed (if something else
  relaxed it) or the agent relaxed the CSP to make the page work. Sometimes the console shows
  inline scripts blocked and hydration is dead.
- **Cause.** The per-response nonce is generated but not stamped onto the inline scripts, or not
  exposed for hydration to reuse. A nonce that matches nothing is not a CSP.
- **Fix.** Generate 16 random bytes per response, stamp via `router.options.ssr.nonce`, expose it
  to hydration through `<meta property="csp-nonce">`, and keep `style-src 'unsafe-inline'` only for
  React inline styles. Error pages are JS-free with `script-src 'self'`.
- **Check.** Load the page, parse the `Content-Security-Policy` header, extract the `script-src`
  nonce, and assert that **every** inline script in the rendered HTML carries the same nonce
  attribute. Assert `'unsafe-inline'` is absent from `script-src`. Load twice and assert the nonce
  rotates between responses.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 13 security checklist and verification checklist;
  `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8.

### D2. Revoking a "dead" anon grant without checking every reader — the `cv_settings` incident

- **Symptom.** CV downloads break in production. The anon `SELECT` grant on `cv_settings` was
  revoked as dead, but `generate-cv` reads that table with the anon key, so the function started
  returning nothing useful.
- **Cause.** "Dead" was assumed from the browser surface, not from the server-side readers. An edge
  function using the publishable/anon key is a legitimate anon reader.
- **Fix.** Restore the grant the same day. Before revoking any anon grant, grep
  `supabase/functions/**` for the table and REST-check anon access with the publishable key.
- **Check.** A grant audit that cross-references every table against function readers and performs
  a REST probe with the publishable key, run as part of the final RLS audit — not a code reading
  alone.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 14 and the security checklist ("Before revoking
  any 'dead' anon grant, verify every reader").

### D3. Rate limit keyed on a client-supplied IP header is bypassable

- **Symptom.** The per-IP rate limit can be bypassed by sending a fake `cf-connecting-ip` or
  `x-forwarded-for` header.
- **Cause.** If the edge-function platform forwards the client-supplied header instead of stripping
  it, `check_rate_limit` keys on attacker-controlled input.
- **Fix.** Run the IP-header trust test. If the platform does not strip the header, move the limit
  to the Worker, where the platform-set value is available.
- **Check.** Send a request with a spoofed `cf-connecting-ip` / `x-forwarded-for` and assert the
  limit still triggers. This is a mandatory test in the security self-test, not an optional one.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 11 (IP-header trust test) and Step 14.

---

## E. Supabase CLI and deploy

### E1. `supabase link` / `db push` before `supabase login` fails with `Access token not found`

- **Symptom.** The data-layer stage fails with the exact string `Access token not found`.
- **Cause.** The CLI is unauthenticated: `supabase link` / `supabase db push` ran before
  `supabase login --token <PAT>`. The CLI does not fall back to the dashboard session.
- **Fix.** Before link/push: create a PAT (dashboard → avatar → **Account settings → Access
  Tokens** → Generate new token), run `supabase login --token <PAT>` (or have the owner complete
  interactive `supabase login`), and supply the DB password via `SUPABASE_DB_PASSWORD` if `link`
  prompts. Do this before the data-layer stage, not on first failure.
- **Check.** Run `supabase projects list` (or `supabase db push --dry-run` against the linked
  project) as the first command of the data-layer stage on a fresh machine; it fails fast if the
  token is missing.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 3 and Phase 0;
  `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 0.

### E2. PAT churn

- **Symptom.** CI deploys and migrations start failing with auth errors, with no code change.
- **Cause.** The Supabase PAT behind `SUPABASE_ACCESS_TOKEN` was rotated or expired. The same token
  is both the local CLI login and the GitHub secret, so one rotation breaks both.
- **Fix.** Refresh the PAT in the dashboard (Account settings → Access Tokens) and update the
  `SUPABASE_ACCESS_TOKEN` GitHub secret with the fresh token.
- **Check.** A deploy precondition that calls a scoped Supabase API with the token and fails with a
  clear message before the deploy steps run. On the reference this was recorded as a recurring trap,
  not a one-off.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 14 ("PAT churn") and Step 12 (secret wiring).

### E3. Migration history desync on a project shared by staging and production

- **Symptom.** `supabase db push` is blocked with a migration-history conflict; recorded as
  "shared prod Supabase migration history desynced (legacy remote version names vs regenerated
  local) - db push needs documented migration repair on live DB first".
- **Cause.** Local migration files were regenerated with new version names while the remote history
  kept the legacy names. One Supabase project is shared by staging and production, so the repair
  must be done on the live database and must be documented.
- **Fix.** Document a migration repair on the live DB first (`supabase migration repair`), then
  push. For renames, use the additive-then-cleanup pattern the reference used for `hero` →
  `spotlight`: apply an additive migration (new keys + new section row), re-key the code, deploy,
  then apply a cleanup migration that drops the old keys. Zero downtime.
- **Check.** Compare `supabase migration list` local vs remote before authoring new migrations, and
  run the same comparison in CI. Never push onto a desynced history.
- **Origin.** field log 2026-09-02 16:43 (blocker, agent-spotlight) → 16:54 (resolved, commits
  `44b7b8d` + `eb49635`).

### E4. Edge functions deploy only with production — there is no function-level staging

- **Symptom.** Deploying an edge function changes production immediately, even when the intent was
  to test on staging.
- **Cause.** One Supabase project is shared by both worker environments. The worker has a preview
  environment; the database and its functions do not.
- **Fix.** Treat every edge-function deploy as a production change: migrations applied before
  schema-dependent code, a recorded rollback, and explicit go-live approval. Never assume a staging
  worker deploy proves anything about the functions.
- **Check.** A pre-deploy diff of `supabase/functions/**` that flags function changes as
  production-affecting, and a parity checklist that states plainly that functions are not covered by
  staging.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 14.

### E5. No backups = no site

- **Symptom.** Content loss. The database holds every section, document and setting; there is no
  copy anywhere else.
- **Cause.** Backups were deferred as an operations task.
- **Fix.** Before launch: regular `supabase db dump` plus a Storage export; test one restore.
- **Check.** Restore the dump into a scratch database and load one page from it. A configured
  backup that was never restored is an unverified claim.
- **Origin.** old kit `GUIDE_FROM_SCRATCH.md` Step 13 and Step 14.

---

## F. Distribution surfaces

### F1. Copy reused as SERP metadata overflows the caps

- **Symptom.** Site audit flags: homepage title 102 characters, homepage meta description 317
  characters, and the static `/terminal/` / `/angband/` pages missing a meta description and an
  `h1`. Search results show truncated text.
- **Cause.** The full marketing copy was emitted unchanged into `title`, `description` and the
  static routes, instead of being derived for the SERP surface.
- **Fix.** `compactDescription()` with a 155-character word boundary in `seo.ts`; cap the homepage
  title (`og:title` keeps the full value); add meta description and `h1` to the static routes;
  `noindex` the `/no` fun page. Do not change visible content.
- **Check.** A live audit asserting every page's meta description is ≤160 characters and the title
  is within cap, plus a static-route check for `h1` and `description`. The reference verified this
  live after deploy.
- **Origin.** field log 2026-09-02 11:44 (commit `6f283ba`) and 13:21 (commit `d86e280`).

---

## Source map

`field log` entries come from the live workspace log `AGENT_BOARD.md`, which is **not part of this
repository** and was read read-only. `old kit` entries come from the files in this repository.

| Entry | Trap | Origin | Where recorded |
|---|---|---|---|
| A1 | iOS auto-zoom below 16px | field log | 2026-09-02 13:08, commit `98f7ad9` |
| A2 | Global `interactive-widget=resizes-content` regression | field log | 2026-09-02 12:10 (`1844dcc`) → 12:20 (`c059005`) |
| A3 | `overflow-x: clip` / WebKit bug 150715 | field log | 2026-09-02 12:35, commit `003cee6` |
| A4 | `top: 0` + `visualViewport.height` drawer | field log | 2026-09-02 12:48, commit `82bf77e` |
| A5 | Horizontal overflow re-triggers zoom | field log | 2026-09-02 12:58, commit `9542a7c` |
| B1 | Deferred-section anchors | both | field log 2026-09-02 12:52 (`bb27c8f`) + 12:56 (`0ab76c6`); old kit `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 4; `AGENTS.md` Stage 3 |
| C1 | Lockfile registry re-homing | both | field log 2026-09-02 13:08 (`666394f`); old kit `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 1; `AGENTS.md` Stage 3 |
| C2 | Lowercase route filenames | old kit | `GUIDE_FROM_SCRATCH.md` Step 14; `AGENTS.md` Stage 5 |
| C3 | Missing public env vars break the worker | old kit | `GUIDE_FROM_SCRATCH.md` Step 14 |
| C4 | Sitemap single source / 307 canonicals | field log | 2026-09-02 11:20 (`7c8f2f9`) and 11:19 |
| D1 | CSP nonce that never matches | old kit | `GUIDE_FROM_SCRATCH.md` Step 13 + verification checklist; `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 |
| D2 | Revoking a "dead" anon grant (`cv_settings`) | old kit | `GUIDE_FROM_SCRATCH.md` Step 14 + security checklist |
| D3 | Rate-limit IP header trust | old kit | `GUIDE_FROM_SCRATCH.md` Step 11 + Step 14 |
| E1 | Supabase CLI auth order | old kit | `GUIDE_FROM_SCRATCH.md` Step 3, Phase 0; `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 0 |
| E2 | PAT churn | old kit | `GUIDE_FROM_SCRATCH.md` Step 14, Step 12 |
| E3 | Migration history desync / additive-then-cleanup | field log | 2026-09-02 16:43 → 16:54, commits `44b7b8d` + `eb49635` |
| E4 | Edge functions deploy only with production | old kit | `GUIDE_FROM_SCRATCH.md` Step 14 |
| E5 | Backups and a tested restore | old kit | `GUIDE_FROM_SCRATCH.md` Step 13 + Step 14 |
| F1 | SERP metadata caps | field log | 2026-09-02 11:44 (`6f283ba`) and 13:21 (`d86e280`) |

### Coverage note

The required trap list is covered: iOS auto-zoom and its wrong-fix ladder (A1–A4), horizontal
overflow zoom (A5), deferred-section anchors and hash routing (B1), lockfile registry re-homing
(C1), CSP nonce mismatch (D1), Supabase CLI auth order plus PAT churn (E1, E2), and anchor/scroll
navigation (B1). Extras mined from the sources: A2–A5, C2–C4, D2–D3, E3–E5, F1.
