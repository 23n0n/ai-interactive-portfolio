# references/distribute.md — the machine-readable layer

Stage 5 of the lifecycle. The visible page is **data plus a distribution layer**: the same content
source that renders the spotlight, the hubs and the docs also feeds `sitemap.xml`, `llms.txt`,
`openapi.json`, the `.well-known/` surfaces, the JSON-LD graph and the SERP description. The page is
not only for humans; it is a machine-readable surface that distributes the person to search engines
and AI agents.

Load this reference only when the visible site, the content model and the interactive features are
already working. Distribution derives from content that exists; it never invents content.

Sibling references: `references/build.md` owns route code, `references/secure.md` owns response
headers and `noindex`, `references/deploy.md` owns staging, `references/operate.md` owns later
content edits.

## 1. One source of truth (hard rule)

**Every machine-readable surface derives from the same content source as the visible page.** The
source is the content model behind public read-only views — the profile domain, `content_collections`,
`content_docs`, `site_content` — reached through the public read RPCs.

Hard consequences:

- **Restating content by hand is the failure mode.** No literal title, pitch or blurb is copied
  into a sitemap template, an `llms.txt` file, a JSON-LD object or a `robots.txt` comment. A surface
  that cannot be derived is not written.
- **A publish/unpublish in the admin changes the surface without a redeploy.** Sitemap, catalog,
  markdown and JSON-LD read the published state at request time.
- **If a surface and the visible page disagree, the surface is wrong** — fix the derivation, not the
  output.
- **Drift is a defect, not a cosmetic issue.** A hand-written `llms.txt` or a hard-coded JSON-LD blob
  is a blocker in the distribution audit (§6), the same way a failing gate is.

The read paths that make this possible are the public RPCs: `get_public_homepage_data()`,
`get_public_homepage_route()`, `get_public_content_catalog(p_include_descriptions boolean default
true)` and `get_public_content_route(p_collection_key text, p_slug text default null)`.

## 2. Text surfaces

All of these are routes on the Worker, served from the same content source. Exact paths and file
names are load-bearing.

### `sitemap.xml`

- **Dynamic, from the published catalog.** The `sitemap` edge function reads
  `get_public_sitemap_data()` — `key`, `base`, `sort_order`, `docs [{slug, updated_at}]` — and emits
  `<urlset>` with one `<url>` per published hub and published doc.
- **Published docs only.** Unpublished rows never appear. Because the data is read per request,
  **publish and unpublish change the sitemap without a redeploy** — this is the whole reason the
  sitemap is a function and not a static file.
- `<lastmod>` comes from the catalog's `updated_at`; never a hard-coded date.
- The sitemap lists canonical URLs only (see the canonical URL logic below).

### `robots.txt`

- Serves crawl rules and points at `sitemap.xml`.
- **`noindex` on admin, auth and staging.** Emit `Disallow:` for `/admin` and `/auth`, and serve the
  staging host (the persistent `workers.dev` preview) with a robots policy that refuses indexing.
  Pair `robots.txt` with the `X-Robots-Tag: noindex` response header — `robots.txt` alone is a
  request, not a control.
- **Object URLs are not crawl targets.** `robots.txt` cannot reach a Storage object URL, so the
  object URL answers with `X-Robots-Tag: noindex` — set at the storage layer, not here — so a known
  URL is not crawled; the upload flow accepts publishable material only (`references/secure.md` §7,
  Uploads; `DATABASE_SCHEMA.md` §8).
- Staging identity is decided by environment, not by a branch: the preview environment is the
  `noindex` one. See `references/deploy.md` and `references/secure.md`.

### `/llms.txt` and `/llms-full.txt`

- `/llms.txt` is the **index**: what the site is, who it belongs to, the canonical URL of the home
  page, the content hubs, and links to the canonical pages an agent should read first.
- `/llms-full.txt` is the **full text**: the knowledge base flattened, one document per published
  doc, each under its canonical URL and `h1`.
- Both derive from the catalog and the document payloads — never a second, hand-maintained copy of
  the site copy.
- Both return **200** with the correct text content type.

### `openapi.json`

- A machine description of the public read surface: the `get_public_*` RPCs and the public edge
  functions an agent may call (`chat`, `analyze-jd`, `get-contact`, `generate-cv`, `sitemap`).
- Generated/derived from the same catalog of routes and functions, not hand-listed.
- It describes **read and explicitly public operations only**. Admin functions
  (`generate-doc-content`, `generate-doc-tags`, `generate-faq-labels`, `translate-recommendation`)
  are never advertised here.

### `Accept: text/markdown` negotiation

- SSR negotiates on the `Accept` header. When a client sends `Accept: text/markdown`, the same route
  returns a Markdown rendering of the same document — not a second copy of the content.
- **Canonical URL logic:** the Markdown response names the canonical HTML URL (a `Link:
  <canonical>; rel="canonical"` header and the canonical URL in the body), so an agent that reads
  Markdown still cites the HTML page. The HTML page carries the matching `<link rel="canonical">`.
- Non-negotiated requests keep the normal HTML response; the negotiation must not change the visible
  page.

### Route files are lowercase on disk

- **Route filenames are lowercase on disk.** An uppercase route file such as `LLMS[.]txt.tsx` makes
  the TanStack route generator drop `/llms.txt`. After adding or renaming machine-readable routes,
  check `git diff src/routeTree.gen.ts` and confirm the route is present.
- This applies to every surface here: `llms.txt`, `llms-full.txt`, `sitemap.xml`, `robots.txt`,
  `openapi.json`.

### Language surfaces (only when the site is bilingual)

The language mode was decided at intake (Q23) and is part of the approved design contract; the
surfaces follow it, and there are exactly two modes — do not blend them:

- **Primary language + secondary metadata.** The site renders one language. The second language
  appears as translated `<title>`/`<meta name="description">`/`og:` values and `hreflang` alternate
  links on the pages that have a translation, with `x-default` pointing at the primary language.
  Nothing is translated twice: the translations come from the same content source (a translated
  description field on the hub/doc), never from a hand-written second copy.
- **Full translated UI.** Every route has a translated sibling (`/pl/…`, `/en/…` or equivalent) and
  the catalog carries both languages; `hreflang` links each pair reciprocally, `<html lang>` is
  correct per route, and the sitemap lists both. This is i18n routing over the same catalog — never
  a parallel hand-maintained page tree.

`<html lang>` matches the rendered language in both modes, and a bilingual site never ships a page
whose `lang` disagrees with its content.

## 3. Discovery surfaces — `.well-known/`

`.well-known/` is the conventional location for surfaces an agent or crawler looks up by name. Every
file is served from the same content source and returns 200.

| Path | What it is for |
|---|---|
| `/.well-known/ai.txt` | Plain-text AI usage statement for the site: what may be crawled, quoted and used, and what is reserved. One place for the owner's AI-permission stance. |
| `/.well-known/llms.txt` | The same index as `/llms.txt`, placed at the well-known location so discovery does not depend on guessing the root path. |
| `/.well-known/agent-card.json` | Machine-readable identity of the site's agent surface: name, owner, canonical origin, contact endpoint, and the URLs of the other discovery files. |
| `/.well-known/agent-skills` | The list of things an agent can do here — for this site, the public operations an agent may invoke (ask the chat, run a fit analysis, fetch contact, download the CV). Names and links match `openapi.json`; never advertise an admin operation. |
| `/.well-known/api-catalog` | Linkset that points at the API description (`openapi.json`) and the agent surfaces, so an agent finds the API without a guess. |

Rules: every file is derived from the content source; no file is a stub; no file lists an endpoint
the site does not serve.

## 4. JSON-LD (schema.org) — derived from the same data

One JSON-LD graph per page, emitted server-side, built from the same payload the page renders.
`@context` is `https://schema.org`; every node is referenced by `@id`, never duplicated inline.

### Root graph: `Person` + `WebSite`

- The root graph on the site carries `Person` and `WebSite` nodes with **stable `@id` anchors**:
  `https://<domain>/#person` and `https://<domain>/#website`. The anchors never change between pages
  or deploys, so other nodes and other sites can reference them.
- `Person` fields (`name`, `jobTitle`, `description`, `url`, `sameAs`) come from the profile data
  projected by the public views.
- **A social image** is attached to the graph (`Person.image`, and the same URL as `og:image`) from
  `profile_image_url` — the column on `public.candidate_profile`, read through the
  `candidate_profile_public` view like every other public surface, never a literal in the JSON-LD
  builder. It is the only image source for `Person.image` / `og:image`; no separate social-card
  column or `og_image_url` override exists to fall back on.
- **One field, two renderings** (the one-source-of-truth rule of §1, in miniature). The visible
  spotlight portrait and the machine-readable image (`Person.image`, `og:image`) both come from that
  same `profile_image_url`, so the portrait a visitor sees and the portrait a crawler fetches cannot
  drift. Replacing the portrait in the admin changes both on the next request, with no redeploy.
- **The URL must be absolute HTTPS.** `og:image` is not resolved against the page for a crawler, and
  the JSON-LD `image` must be absolute too, so a bare path or a path-only Storage reference is a
  defect. A public `kb-images` object URL satisfies this.
- **The alt text is derived, not stored.** There is no alt column: the renderer builds
  `og:image:alt`, and the equivalent alternative text on the JSON-LD image, from `name` — adding
  `title` where it helps. Nothing about the portrait is edited twice.
- **At least roughly 1200px wide.** Crawlers and social cards skip or upscale smaller portraits, so
  the owner should publish an image about 1200px or wider on its long edge. This constrains the
  asset, not the schema.
- `WebSite` carries `name`, `url` and the site's canonical origin.

### Per-page types

| Page | JSON-LD type | Notes |
|---|---|---|
| Home | `ProfilePage` | References `Person` and `WebSite` by `@id`; never re-declares them. |
| Content page (hub or doc) | `BreadcrumbList` | Home → hub → doc, using the canonical URL of each level. |
| Doc with `faqs` | `FAQPage` | One `Question`/`Answer` pair per `faqs` entry in the document payload. Derived from `faqs`, not authored twice. |
| Hub | `CollectionPage` | The collection `h1` and `description` plus its published docs. |
| Article doc | `Article` | For docs in the articles collection: `headline`, `description`, `dateModified`. |
| Collection-typed docs | `Service`, `EducationalOccupationalCredential`, `Event` | Certifications → `EducationalOccupationalCredential`; speaking → `Event`; services → `Service`. |

The typed nodes come from the same `doc` payload as the page. If a doc's type changes in the admin,
the graph changes on the next request.

## 5. SERP meta description

- **One field, two renderings.** The description comes from a single content field (`description` on
  the hub or doc). From it, the page renders:
  - `<meta name="description">` — the **short** form, about **155 characters**, cut on a **word
    boundary** (never mid-word, never with a trailing ellipsis that changes the meaning).
  - `og:description`, `twitter:description` and the JSON-LD `description` — the **full** text.
- **The visible page copy is never truncated.** The short form exists only for the search snippet;
  the page body and the social/structured descriptions keep the full text.
- Because both forms derive from one field, they cannot drift out of sync. Two hand-written
  descriptions would drift, and are forbidden.
- A missing `description` does not fall back to a truncated first paragraph; it is a content defect
  to fix in the admin, and it fails the audit below.

## 6. The distribution audit

Run this against the **live** site (staging is enough before go-live) after the machine-readable
layer is built, and again after content changes. Every item is a check with evidence.

- [ ] `sitemap.xml` returns 200 and parses as XML.
- [ ] `robots.txt` returns 200; `/admin` and `/auth` are disallowed; the staging host is `noindex`
      (`robots.txt` and `X-Robots-Tag`).
- [ ] `/llms.txt` returns 200, and `/llms-full.txt` returns 200.
- [ ] `openapi.json` returns 200 and parses.
- [ ] Every `.well-known/` surface returns 200 (`ai.txt`, `llms.txt`, `agent-card.json`,
      `agent-skills`, `api-catalog`).
- [ ] `Accept: text/markdown` returns a Markdown body naming the canonical HTML URL; the HTML page
      names the same canonical URL.
- [ ] **No page ships an empty description**, and no page's `<meta name="description">` is over
      ~160 characters.
- [ ] **No page's SERP description is out of sync** with its `og:description`,
      `twitter:description` and JSON-LD `description` (same source field).
- [ ] **Sitemap matches the catalog**: every published hub and published doc is listed once; no
      unpublished row appears; removing a page from the catalog removes it from the sitemap without
      a redeploy.
- [ ] **JSON-LD validates** (schema.org validator) on the home page, a hub, a doc with FAQs, a
      certification, a speaking entry and an article doc; `@id` anchors are stable across pages.
- [ ] **The surfaces match the visible page**: the name, title, pitch and doc text in `llms.txt`,
      JSON-LD and the sitemap are the same strings the visitor sees.
- [ ] Route files for the machine-readable surfaces are **lowercase on disk**, and
      `git diff src/routeTree.gen.ts` shows the routes are generated.
- [ ] **Language surfaces match the recorded mode** — bilingual site: `hreflang`/alternate links are
      reciprocal (including `x-default`), `<html lang>` matches each page, and no translated page is
      a hand-written copy of the other language.

A failed item is a defect to fix, not a note to carry. Do not report Stage 5 complete while any
surface 500s, any description is empty or over-long, or the sitemap and the catalog disagree.

## Source map

| Section | Old-kit section |
|---|---|
| 1. One source of truth | `SKILL_INTERACTIVE_PORTFOLIO.md` Non-negotiables #5 ("Content = data, not JSX"); `GUIDE_FROM_SCRATCH.md` Step 8 (Phase C: pages, internal links, sitemap, JSON-LD from the same source) |
| 2. Text surfaces — `sitemap.xml` | `DATABASE_SCHEMA.md` §4 (`get_public_sitemap_data()`); §9 (`sitemap` edge function: dynamic `sitemap.xml` from the catalog, published docs only, no redeploy); `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 ("Machine-readable routes"); `GUIDE_FROM_SCRATCH.md` Step 11 |
| 2. Text surfaces — `robots.txt` | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 and Verification checklist ("staging noindex"); `GUIDE_FROM_SCRATCH.md` Step 12–13 and Security checklist (`noindex` on staging, `/admin`, `/auth`) |
| 2. Text surfaces — `llms.txt` / `llms-full.txt` | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 and Verification checklist (`llms.txt` 200); `GUIDE_FROM_SCRATCH.md` Step 11 `[Check]`, Step 12–13 |
| 2. Text surfaces — `openapi.json` | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 ("Machine-readable routes"); `GUIDE_FROM_SCRATCH.md` Step 11 |
| 2. Text surfaces — `Accept: text/markdown` + canonical URL | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 (SSR returns Markdown, canonical URL logic); `GUIDE_FROM_SCRATCH.md` Step 11 |
| 2. Text surfaces — lowercase route files | `GUIDE_FROM_SCRATCH.md` Step 14 (Known pitfalls: uppercase `LLMS[.]txt.tsx` drops `/llms.txt`) |
| 3. Discovery surfaces — `.well-known/` | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 (`.well-known/` AI-discovery surfaces: `ai.txt`, `llms.txt`, `agent-card.json`, `agent-skills`, `api-catalog`); `GUIDE_FROM_SCRATCH.md` Step 11 |
| 4. JSON-LD | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 ("JSON-LD (schema.org) derived from the same data": root `Person` + `WebSite`, `ProfilePage`, `BreadcrumbList`, `FAQPage`, `CollectionPage`, `Article`, collection-typed docs); `GUIDE_FROM_SCRATCH.md` Step 11; `DATABASE_SCHEMA.md` §6 (`ContentDoc` shape, `faqs`) |
| 5. SERP meta description | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 ("SERP meta description"); `GUIDE_FROM_SCRATCH.md` Step 11 |
| 6. Distribution audit | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 gate and Verification checklist (`llms.txt` / `llms-full.txt` / `sitemap.xml` / `robots.txt` / `openapi.json` 200; staging `noindex`); `GUIDE_FROM_SCRATCH.md` Step 11 `[Check]`, Step 12–13, Security checklist |
