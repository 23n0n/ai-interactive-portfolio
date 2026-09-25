# Schema — Access layer (roles, views, RPCs, functions, storage, grants)

> **Holds:** source §1 (roles, access model, conventions), §3 (public views), §4 (read RPCs), §5
> (`private` schema), §7 (functions, triggers, hooks, cron), §8 (`kb-images` storage bucket and its
> policies), §9 (edge functions and the service-role access matrix), §10 (RLS and grants summary
> matrix).
> **Loaded at:** Build — data layer, security half; re-loaded at Publish for the security audit.
> **Source:** `DATABASE_SCHEMA.md` §§1, 3, 4, 5, 7, 8, 9, 10, verbatim, including the 2026-09-25
> hardening revision.
> **Cross-references:** §2.1/§2.2/§2.3 table definitions → `profile.md`, `content.md`, `ai-ops.md`;
> §6 ContentDoc
> shape → `content.md`; §11 migrations → `seeds.md`; **§12 final RLS audit (A–G) → `audit.md`**.
> The source's citations of §5 and §9 in this file point at sections that also live here.

---

## 1. Roles and the access model

| Role | What it can do |
|---|---|
| `anon` | `SELECT` on `public.*_public` views only — including `cv_settings_public` and the three registry views (`site_sections_public`, `fun_links_public`, `holiday_banners_public`); `EXECUTE` on `public.get_public_*` RPCs. **No direct base-table access at all**, no writes anywhere. |
| `authenticated` | Everything `anon` has, plus admin operations gated by `is_admin()`: full CRUD on base tables, Storage writes to `kb-images`. Non-admin `authenticated` sessions get the same as `anon` (plus admin-panel login). |
| `service_role` | Bypasses RLS. Used exclusively by edge functions (chat, analyze-jd, generate-cv, abuse-alert, ...). Explicit grants per the access matrix (§9). |

Admin identification: `public.is_admin()` returns
`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`. The admin user is
created manually in Supabase Auth (email/password); set `role: "admin"` in
their `app_metadata` (Dashboard → Authentication → Users → user → edit
metadata, or SQL). **Public signup is disabled** (`[auth] enable_signup =
false`); the single administrator is provisioned by hand (Dashboard →
Authentication → Users, or an invite), and the privileged path is an **immutable
user-id allowlist** checked next to `is_admin()`. Domain restriction is defence in
depth for the day signup is re-enabled, not the control: a `BEFORE INSERT` trigger
on `auth.users` (`public.check_email_domain`) plus the Supabase auth hook
`public.hook_restrict_signup_by_email_domain(event jsonb)` reject any email not
matching `<your-domain>` (reference: `@zabrowski.pl`). Both must be granted
`EXECUTE` to `supabase_auth_admin` and revoked from
`public`/`anon`/`authenticated`. Every account creation and every
`app_metadata.role` change is an alerting event (`references/operate.md` §4.1).

Conventions:

- Every table: `id uuid primary key default gen_random_uuid()` unless noted;
  `created_at`/`updated_at timestamptz not null default now()`.
- `updated_at` maintained by the `public.set_updated_at()` trigger function on
  tables that are edited (content, site content, banners, links, sections, CV
  settings).
- Public surface = view per table named `<table>_public`, always
  `WITH (security_invoker = on, security_barrier = true)`, selecting only
  publishable columns, from `private.api_<table>` views (see §5).
- Row-level `publish_status`/`is_active`/`is_visible`/`is_public` flags drive
  what the public surface shows; the site never renders non-published rows.

---

## 3. Public views (`public.*_public`)

All views below are read-only surfaces for the site. They are
`WITH (security_invoker = on, security_barrier = true)` wrappers over the
`private.api_*` views (§5) — the wrapper applies the caller's RLS while the
private view (security barrier) prevents leaking unpublished rows through
leaky joins. The private view is where both the row filter (`publish_status`,
`is_visible`, `is_active`, the banner's active window) and the column pruning
(`cv_settings_public` never projects `creation_prompt`) live; the wrapper adds
no logic of its own. `anon` and `authenticated` get `SELECT`; `service_role` also
gets `SELECT` (edge functions). Writes on views are revoked for all roles.

| View | Projected columns |
|---|---|
| `candidate_profile_public` | `id, name, title, elevator_pitch, availability_status, target_company_stages, linkedin_url, profile_image_url` |
| `experiences_public` | `id, candidate_id, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, display_order` |
| `skills_public` | `id, candidate_id, skill_name, category, self_rating, years_experience` |
| `gaps_weaknesses_public` | `id, candidate_id, gap_type, description, interest_in_learning` |
| `recommendations_public` | `id, candidate_id, recommender_name, recommender_title, recommender_company, recommendation_text` (= `COALESCE(CASE WHEN translation_reviewed THEN recommendation_text_en END, recommendation_text)`), `original_text`, `is_translated` (= true only when the served text is a **reviewed** translation), `display_order` — only `is_public = true` rows |
| `site_content_public` | `key, group_name, value` — only `publish_status = 'published'` |
| `content_collections_public` | `key, base, sort_order, hub, updated_at` — only `publish_status = 'published'` |
| `content_docs_public` | `id, collection_key, slug, sort_order, doc, updated_at` — only when doc AND parent collection are `published` |
| `site_sections_public` | `id, section_key, label, description, display_order` — only `is_visible = true` rows |
| `fun_links_public` | `id, href, title, description, tag, icon, display_order` — only `is_active = true` rows |
| `holiday_banners_public` | `id, banner_key, emoji, message, gradient_from, gradient_via, gradient_to, particles, dismiss_animation, start_date, end_date, display_order` — only `is_active = true` rows inside their `start_date`/`end_date` window |
| `cv_settings_public` | `headline_title, subtitle, summary, achievements, skills_keywords, certifications, education, details, earlier_note, interactive_note, banner_note, footer_note, site_url` (the singleton row) — **never `creation_prompt`**, which is operator-only prompt text |

---

## 4. Read RPCs (called by the site with the anon/publishable key)

All are `security invoker`, `set search_path = ''`, `GRANT EXECUTE` to
`anon, authenticated`, revoked from `public`. Because they are invoker RPCs,
everything they read must be readable by the caller — which is why the public
registries and the CV singleton are read through their `*_public` views, not
the base tables (no API role holds a base-table grant).

| Function | Returns | Purpose |
|---|---|---|
| `get_public_homepage_data()` | jsonb | One-call homepage payload: `profile`, `experiences` (ordered `start_date desc nulls last`), `skills`, `gaps`, `recommendations`, `siteSections` (visible only), `funLinks` (active only), `holidayBanner` (single active banner in window, ordered by `display_order`) — reads the registries through `site_sections_public` / `fun_links_public` / `holiday_banners_public`, never the base tables |
| `get_public_homepage_route()` | jsonb | `homepage` + `contentCatalog` (collections with doc slugs/labels) — used by SSR home |
| `get_public_content_catalog(p_include_descriptions boolean default true)` | jsonb | Full catalog: `key`, `base`, `hub {h1, description}`, `docs [{slug, h1, description?, label}]` — powers nav, sitemap, related-picker |
| `get_public_content_route(p_collection_key text, p_slug text default null)` | jsonb | Hub or doc payload + `relatedLinks` — direct refs, then backlinks, then tag matches, max 6, deduped; null for missing collection |
| `get_public_sitemap_data()` | jsonb | `key`, `base`, `sort_order`, `docs [{slug, updated_at}]` for `sitemap.xml` |

---

## 5. Private schema (`private`)

Schema `private`: `REVOKE ALL ON SCHEMA private FROM public`; `USAGE` granted
to `authenticated`, `anon`, `service_role` (as needed by the view wrappers /
edge functions).

`private.api_*` views (`security_barrier = true`), one per public surface,
hold the actual read logic (published/active filters, `COALESCE` for
translations). The `public.*_public` wrappers just re-select from them.
List: `api_candidate_profile_public`, `api_experiences_public`,
`api_skills_public`, `api_gaps_weaknesses_public`,
`api_recommendations_public`, `api_site_content_public`,
`api_content_collections_public`, `api_content_docs_public`,
`api_site_sections_public`, `api_fun_links_public`,
`api_holiday_banners_public`, `api_cv_settings_public`.
`SELECT` granted to `anon`, `authenticated`, `service_role`; revoked from
`public`.

Monitoring RPCs live in `private` as SECURITY DEFINER bodies:
`private.get_monitoring_stats()`, `private.get_cache_sizes()`,
`private.get_database_size()` (admin-guarded with `is_admin()`), with thin
`public` `security invoker` wrappers. In the hardened reference the public
wrappers are **revoked from anon/authenticated** — service-role/operator use
only (the site never calls them; keep them out of the client bundle).

---

## 7. Functions, triggers, hooks, cron

### SECURITY DEFINER helpers (service_role only unless noted)

| Function | Signature | Notes |
|---|---|---|
| `check_rate_limit` | `(p_ip_address text, p_function_name text, p_max_calls integer, p_window_minutes integer) → boolean` | Aligned window (`date_trunc` on `p_window_minutes`); deletes entries older than 1h; inserts/increments; false = blocked. `GRANT EXECUTE` to `service_role` only |
| `get_chat_cache` | `(p_hash text, p_question text) → text` | 48h TTL; exact hash → exact normalized text → hybrid fuzzy (bigram Dice ≥ 0.52 with ≥ 2 overlapping tokens, or ≥ 0.68; long texts >200 chars need ≥ 0.75; length-ratio guard 0.4) |
| `set_chat_cache` | `(p_hash text, p_question text, p_response text) → void` | upsert on `question_hash`; deletes > 48h |
| `get_jd_cache` | `(p_hash text) → jsonb` | 7-day TTL |
| `set_jd_cache` | `(p_hash text, p_jd text, p_result jsonb) → void` | upsert on `jd_hash`; deletes > 7 days |
| `insert_rag_metric` | `(p_function_name text, p_cache_hit boolean, p_topics_activated text[], p_prompt_chars integer, p_input_tokens integer default null, p_output_tokens integer default null, p_question_preview text default null) → void` | scrubs PII from the preview (emails, phone/ID-like digit runs, URLs and query strings), truncates to 100 chars, stores `NULL` when nothing survives; deletes rows > **7 days** |
| `normalize_cache_question` | `(p_text text) → text` | IMMUTABLE; lowercase, strip punctuation, light plural stemming, stop-word removal — for cache hit quality |
| `bigram_similarity` | `(a text, b text) → float` | IMMUTABLE; Dice coefficient on normalized bigrams |
| `set_updated_at` | trigger | sets `NEW.updated_at = now()` |

### Public read RPCs — see §4

### Auth hook

| Function | Purpose |
|---|---|
| `check_email_domain()` | trigger function: `BEFORE INSERT ON auth.users` — rejects emails not ending `@<your-domain>` (reference `@zabrowski.pl`). `GRANT EXECUTE` to `supabase_auth_admin`. Enforces the domain even if the dashboard hook is not wired |
| `hook_restrict_signup_by_email_domain(event jsonb) → jsonb` | Supabase auth hook: returns `{decision: 'continue'}` or `{decision: 'reject', message}`. `GRANT EXECUTE` to `supabase_auth_admin`; revoked from `public`/`anon`/`authenticated`. **Wire it in the dashboard after deploying the functions:** Authentication → Hooks → Customize Signup → select the function — this gives users the friendly rejection message |

### Triggers

`set_updated_at` before update on: `content_collections`, `content_docs`,
`site_content`, `site_sections`, `fun_links`, `holiday_banners`, `cv_settings`.

`purge_cv_documents` after update or delete on `cv_settings`
(`FOR EACH STATEMENT`): `DELETE FROM public.cv_documents`. A settings edit
changes the CV, so every cached PDF is stale the moment it lands — the same
statement that invalidates `source_hash` clears the cache rather than leaving
orphan rows behind.

`purge_ai_caches` after insert, update or delete on `values_culture`,
`faq_responses` or `ai_instructions` (`FOR EACH STATEMENT`):
`DELETE FROM public.chat_response_cache`. Those three tables are the private AI
context, and `cache_version` includes their hash — purging makes the invalidation
immediate rather than depending on every caller recomputing the version.

`audit_admin_change` after insert, update or delete on each administrator-editable
table (`FOR EACH ROW`, SECURITY DEFINER): appends one `public.admin_audit` row —
actor, operation, table, row id, request id, before/after hashes — for the tables
listed in §2.3. It is the only writer of that table, and it raises if a caller
tries to modify or delete an existing audit row.

### pg_cron

- `cleanup-rate-limits` — hourly `DELETE FROM public.rate_limits WHERE
  window_start < now() - interval '1 hour'` (safety net; the function already
  cleans on each call).
- `cleanup-rag-metrics` — daily `DELETE FROM public.rag_metrics WHERE
  created_at < now() - interval '7 days'` (mirrors the in-function TTL; the
  AI endpoints are quiet weeks, so the insert-time sweep alone is not a
  guarantee).
- `cleanup-cv-documents` — daily `DELETE FROM public.cv_documents WHERE
  generated_at < now() - interval '30 days'` (regenerable cache hygiene; the
  `cv_settings` trigger handles correctness, this handles size).
- `cleanup-admin-audit` — daily `DELETE FROM public.admin_audit WHERE at <
  now() - interval '400 days'`, **after** the off-platform export of
  `references/operate.md` §4.1 confirms the batch is stored: the trail is pruned
  only from a copy that exists elsewhere.

Requires the `pg_cron` extension (schema `pg_catalog`).

---

## 8. Storage: bucket `kb-images`

| Setting | Value |
|---|---|
| `id` / `name` | `kb-images` |
| `public` | `true` (objects render from public URLs) |
| `file_size_limit` | `5242880` (5 MB) |
| `allowed_mime_types` | `['image/png','image/jpeg','image/webp','image/gif']` — **no SVG** (scriptable content; removed in hardening) |

Policies on `storage.objects`:

| Policy | Target | Rule |
|---|---|---|
| `kb-images admin select` | `FOR SELECT TO authenticated` | `bucket_id = 'kb-images' AND is_admin()` (admin image picker listing; a public bucket needs no public SELECT policy — object URLs work directly) |
| `kb-images admin insert` | `FOR INSERT TO authenticated` | `bucket_id = 'kb-images' AND is_admin()` |
| `kb-images admin update` | `FOR UPDATE TO authenticated` | `bucket_id = 'kb-images' AND is_admin()` |
| `kb-images admin delete` | `FOR DELETE TO authenticated` | `bucket_id = 'kb-images' AND is_admin()` |

Uploads are named server-side (a generated UUID plus a format-derived
extension, never the client filename); the sanitizer allow-list (`<img>` **https
only**, no `data:` URIs, hosts limited to the CSP `img-src` allowlist) applies at
render time, and uploads are served from the bucket's own origin under
`Referrer-Policy: no-referrer` so an external page cannot learn a visitor's
requests.

**The ingest pipeline is stricter than the bucket.** MIME allow-lists and the size
cap are the outer bound; the upload path also (1) verifies the **detected** format
against the claimed one — magic bytes, not the `Content-Type` header — and rejects
a mismatch; (2) **decodes and re-encodes** the image server-side so a malformed
decoder payload or a polyglot never reaches storage as-is; (3) strips all metadata
(EXIF, colour profiles, comments); (4) enforces pixel and decompression limits
before decoding, so a small file cannot expand into a memory bomb; and (5) scans
or quarantines anything that fails (1)–(4) instead of storing it. The bucket is
**public by design**: every object URL is fetchable by anyone who has it, so
`kb-images` holds publishable material only. The admin image library says so in
plain words, non-public material belongs in a private bucket served by signed
URLs, and a takedown path exists — delete the object, purge the CDN/browser cache
entry, and record the removal (`references/operate.md` §4.3).

---

## 9. Edge functions and the service-role access matrix

All edge functions deploy with `--no-verify-jwt` (auth by Turnstile / admin
check / origin gate) and enforce CORS allowlists (prod domains + staging
only) plus 405/415 guards (`_shared/http.ts`). DeepSeek calls go through the
shared client `_shared/deepseek.ts` — the API key is read from the
**`deepseek`** edge-function secret (`Deno.env.get("deepseek")`), never
shipped to the browser. Set it with `supabase secrets set deepseek=<sk-...>`.

| Function | Purpose | DB access (service role) |
|---|---|---|
| `chat` | "Ask AI about me" — RAG over the knowledge base, topic detection, DeepSeek, response cache, per-IP rate limit | `content_docs_public` read; `check_rate_limit`, `get/set_chat_cache`, `insert_rag_metric` |
| `analyze-jd` | Paste a job description → honest fit analysis; JD cache; per-IP rate limit | `candidate_profile_public`, `experiences_public`, `skills_public`, `gaps_weaknesses_public`, `recommendations_public` reads; `check_rate_limit`, `get/set_jd_cache`, `insert_rag_metric` |
| `generate-cv` | CV/PDF generation. The Turnstile response arrives **only in a `POST` body** (never a URL) and is verified server-side; a verified `POST` mints a short-lived single-use **signed download token**, and the `GET`/`HEAD` that fetch the PDF must present it — so no method is unverified and no challenge reaches a log, a referrer or browser history. Reads the full `cv_settings` row (including `creation_prompt`) with the **service-role** client; PDF cached in `cv_documents` keyed by the hash of the whole CV input | `cv_settings` read (**service role**), `cv_documents` write (service role), `check_rate_limit`, `insert_rag_metric` |
| `generate-doc-content` | Admin: DeepSeek generates draft doc content (blocks) for the KB editor | reads/writes via authenticated admin JWT |
| `generate-doc-tags` | Admin: DeepSeek suggests tags for a doc | admin JWT |
| `generate-faq-labels` | Admin: DeepSeek suggests FAQ labels | admin JWT |
| `translate-recommendation` | Admin: DeepSeek translates a recommendation to English → writes `recommendations.recommendation_text_en` and forces `translation_reviewed = false`; the view serves the translation only after an admin confirms it (`is_translated` then true) | authenticated admin JWT |
| `get-contact` | Public contact endpoint: `GET /functions/v1/get-contact` → `candidate_profile_public` fields (`name, title, elevator_pitch, availability_status, linkedin_url, target_company_stages`); 404 when no profile row; contact info never includes email/phone | `candidate_profile_public` read |
| `sitemap` | Dynamic `sitemap.xml` from the catalog (published docs only) — crawlers see publish/unpublish without redeploy | `get_public_sitemap_data()` |
| `abuse-alert` | Scheduled watchdog (every 15 min via `supabase/config.toml` `schedule = "*/15 * * * *"`): aggregates `rag_metrics` over the window, compares against env thresholds (`ABUSE_WINDOW_MINUTES`, `ABUSE_MAX_CALLS_CHAT/JD/CV`, `ABUSE_MAX_TOKENS`), writes breaches to `abuse_alerts`; `detail` is built from aggregates only — counts, thresholds, window sizes, timestamps, function names, never question text, user content, IPs or PII; optional counts-only webhook mirror (`ABUSE_ALERT_WEBHOOK_URL` — counts only, same rule) | `rag_metrics` read, `abuse_alerts` write |

**Admin-function authentication (non-negotiable):** because the four admin
functions deploy `--no-verify-jwt`, they must verify the caller's JWT
**themselves** — check presence AND signature via the Supabase client
(`auth.getUser()` against the service-role client — decoding the JWT without
verifying the signature is NOT authentication). Behaviour contract:

- no `Authorization: Bearer` header → `401`;
- tampered/forged token → `401`;
- valid token of a NON-admin user → `403`;
- valid admin token → works.

The Phase 8 audit and the Step 11 gates test exactly these four cases.

**Ordering is part of the contract.** The `OPTIONS` CORS preflight — which
carries no credentials by design — is the **only** response a function may
return before the auth check. Every other request, on every method and path,
runs the signature-verifying `auth.getUser()` first: before the method guard,
before the body guard, before any handler logic. A path that can return before
auth (an early `GET` branch beside a `POST`-only guard is the classic shape) is
an auth bypass even though the token is verified somewhere else in the file.

So the audit adds two cases to the four above: `OPTIONS` returns the preflight
response **without** a token, and a tokenless non-`OPTIONS` request returns
`401` **even for an unsupported method** — proving no handler path is
reachable ahead of the auth check.

Explicit service-role grants the migrations add (idempotent, additive):

- `USAGE ON SCHEMA private`; `SELECT` on all `private.api_*` views.
- `SELECT` on all `public.*_public` views.
- `EXECUTE` on `check_rate_limit`, `get/set_chat_cache`, `get/set_jd_cache`,
  `insert_rag_metric`, `is_admin`.
- `ALL` on `abuse_alerts`.

**Rate-limit key — one trusted header.** `check_rate_limit` is keyed on the
client IP the **platform** sets (`cf-connecting-ip` on the reference runtime),
and on nothing else. `x-forwarded-for` is client-appendable and must never be
read, preferred, or used as a fallback; if the platform header is absent the
function fails closed (structured error + alert) instead of keying the limit on
attacker-controlled input. Confirm at setup that the platform sets and strips
that header — that is the IP-header trust test (`references/secure.md` §5), a
mandatory gate, not a smoke test.

Edge functions with `verify_jwt = false` must not be reachable without a
credential or origin check: CORS allowlist + Turnstile (CV) + per-IP rate
limits (AI) + admin JWT checks cover this. Remember: CORS is browser-only —
the functions are publicly reachable endpoints; the rate limits / Turnstile
/ JWT checks are the actual access control.

---

## 10. RLS and grants — summary matrix

**Threat model — read once.** The RLS model below is the actual security
boundary of the site. The other controls in the kit (rate limits, input
caps, response caching, Turnstile) limit **abuse and excessive AI use** —
they are not designed to stop a determined attacker. Never treat them as
attack protection; verify the RLS model instead (see §12).

Base tables: RLS **enabled everywhere**. Pattern per table family:

| Family | Tables | anon | authenticated | service_role |
|---|---|---|---|---|
| Profile (private context) | `values_culture`, `faq_responses`, `ai_instructions` | denied (deny policy, no grants) | `SELECT`/writes only via `is_admin()` policies | bypasses RLS |
| Profile (public surface) | `candidate_profile`, `experiences`, `skills`, `gaps_weaknesses`, `recommendations` | deny policy on base table (column-level grants only for view columns in older migrations; final state: **no anon base-table access**), reads via `*_public` views | `is_admin()`-gated CRUD | bypasses RLS |
| Content | `content_collections`, `content_docs`, `site_content` | denied directly; reads via `*_public` views | `is_admin()`-gated CRUD | bypasses RLS |
| Site chrome | `site_sections`, `fun_links`, `holiday_banners` | denied directly (deny policy, no grants); reads via `site_sections_public` / `fun_links_public` / `holiday_banners_public` — the visible/active/window filters live in the private `api_*` view | `is_admin()`-gated CRUD | bypasses RLS |
| CV | `cv_settings`, `cv_documents` | `cv_settings`: denied directly; the public CV content reads through `cv_settings_public` (never `creation_prompt`); `cv_documents`: denied (deny-all) | `cv_settings`: `is_admin()` reads and writes; `cv_documents`: denied | bypasses RLS |
| Ops | `rate_limits`, `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`, `abuse_alerts`, `admin_audit` | denied (deny-all policies; `abuse_alerts` additionally has explicit REVOKEs; `admin_audit` has no policy for any API role) | `abuse_alerts`: admin `SELECT`/`UPDATE`; `admin_audit`: read only through the `is_admin()`-guarded RPC, no write grant | bypasses RLS |

Grant hygiene (from the hardening migrations, keep them):

- Revoke `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` on all
  `public.*_public` views from `anon, authenticated, public` — the view layer
  is read-only.
- Revoke write grants on deny-all tables and on admin tables from `anon`.
- Keep `authenticated` write grants on admin tables — the RLS model depends
  on them (Postgres enforces grants AND policies; the admin JWT write path
  needs both).
- `anon` holds `SELECT` on **no base table**: the public registries and
  `cv_settings` read through their `*_public` views, so their base-table
  grants and the old `USING (true)` read policy are gone. Base-table read
  policies on those tables are `is_admin()`-only, like the profile and content
  families. Before revoking anything that looks "dead", grep
  `supabase/functions/**` for the table — an edge function using the
  publishable key is a legitimate reader (this exact mistake broke
  `generate-cv` once — `references/pitfalls.md` D2 has the write-up). Companion rule: a function that needs a column the public
  view hides (`creation_prompt`) uses the **service-role** client, never a
  wider public grant.
- `EXECUTE` on cache/utility RPCs: `service_role` only. `is_admin()`:
  `authenticated` (RLS uses it via SECURITY DEFINER regardless).
