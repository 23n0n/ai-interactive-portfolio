# Database Schema Reference

Complete, implementation-ready schema for the interactive portfolio, as
validated against the reference project (zabrowski.pl, 2026-08-24). Every
table, column, view, function, policy, grant and storage rule below exists in
the reference; names are the reference names — adapt content to your persona,
keep the structure.

Target: **Supabase (Postgres 15+, free tier)**, applied via committed SQL
migrations (`supabase/migrations/NNNN_*.sql`) and pushed with
`supabase db push`. The Supabase CLI links the local repo to the remote
project; migrations are the single source of truth for the schema. Deploy
workflows never apply migrations — apply pending migrations **before**
deploying schema-dependent changes.

Security model in one paragraph: the site reads through **public read-only
views + read RPCs**, never base tables. Base tables are RLS-enabled and locked
to the admin role for writes; anonymous clients get column-restricted access
only through the view layer. All writes happen with the service role (edge
functions) or an authenticated admin JWT through `is_admin()`-gated policies.
Private/sensitive columns never leave the view layer.

---

## 1. Roles and the access model

| Role | What it can do |
|---|---|
| `anon` | `SELECT` on `public.*_public` views only; `EXECUTE` on `public.get_public_*` RPCs; direct reads of `cv_settings` (public CV content) and the public registries (`site_sections` visible rows, `fun_links` active rows, `holiday_banners` active rows in window). No other direct base-table access, no writes anywhere. |
| `authenticated` | Everything `anon` has, plus admin operations gated by `is_admin()`: full CRUD on base tables, Storage writes to `kb-images`. Non-admin `authenticated` sessions get the same as `anon` (plus admin-panel login). |
| `service_role` | Bypasses RLS. Used exclusively by edge functions (chat, analyze-jd, generate-cv, abuse-alert, ...). Explicit grants per the access matrix (§9). |

Admin identification: `public.is_admin()` returns
`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`. The admin user is
created manually in Supabase Auth (email/password); set `role: "admin"` in
their `app_metadata` (Dashboard → Authentication → Users → user → edit
metadata, or SQL). Signups are restricted to your own email domain: a
`BEFORE INSERT` trigger on `auth.users` (`public.check_email_domain`) plus the
Supabase auth hook `public.hook_restrict_signup_by_email_domain(event jsonb)`
reject any email not matching `<your-domain>` (reference:
`@zabrowski.pl`). Both must be granted `EXECUTE` to `supabase_auth_admin` and
revoked from `public`/`anon`/`authenticated`.

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

## 2. Tables

### 2.1 Profile domain

> **Population:** the profile tables are NOT seeded by migrations in the
> reference — enter them through the admin panel (or a one-off seed
> migration): the singleton `candidate_profile` row, `experiences`,
> `skills`, `gaps_weaknesses`, `recommendations`, the private AI-context
> tables (`values_culture`, `faq_responses`, `ai_instructions`) and the
> `cv_settings` singleton. The homepage, AI chat/JD analysis and CV
> generation all read from these — nothing renders until they hold data.

#### `public.candidate_profile` — single-row persona profile

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `created_at`, `updated_at` | timestamptz NOT NULL | default `now()` |
| `name` | text NOT NULL | |
| `email` | text | admin-visible only (never in views) |
| `phone` | text | admin-visible only (never in views) |
| `title` | text | headline / role |
| `target_titles` | text[] | default `'{}'` |
| `target_company_stages` | text[] | default `'{}'` (e.g. seed, growth, enterprise) |
| `elevator_pitch` | text | |
| `career_narrative` | text | |
| `looking_for` | text | |
| `not_looking_for` | text | |
| `management_style` | text | |
| `work_style` | text | |
| `salary_min`, `salary_max` | integer | |
| `availability_status` | text | |
| `availability_date` | date | |
| `location` | text | |
| `remote_preference` | text | |
| `github_url`, `linkedin_url`, `twitter_url` | text | `linkedin_url` is the only URL projected publicly |

#### `public.experiences` — work history

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `company_name` | text NOT NULL | |
| `title` | text NOT NULL | |
| `title_progression` | text | |
| `start_date`, `end_date` | date | |
| `is_current` | boolean NOT NULL | default `false` |
| `bullet_points` | text[] | default `'{}'` |
| `why_joined`, `why_left` | text | private (never public) |
| `actual_contributions` | text | private |
| `proudest_achievement` | text | private |
| `would_do_differently` | text | private |
| `challenges_faced`, `lessons_learned` | text | private |
| `manager_would_say`, `reports_would_say` | text | private |
| `quantified_impact` | jsonb | default `'{}'` |
| `display_order` | integer NOT NULL | default `0` |

Indexes: `experiences_candidate_id_idx (candidate_id)`;
`experiences_public_start_idx (start_date desc nulls last)`.

#### `public.skills` — skills matrix (strong / moderate / gap)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `skill_name` | text NOT NULL | |
| `category` | text NOT NULL | CHECK `in ('strong','moderate','gap')` |
| `self_rating` | integer | CHECK between 1 and 5 |
| `evidence` | text | private |
| `honest_notes` | text | private |
| `years_experience` | integer | |
| `last_used` | date | |

Indexes: `skills_candidate_id_idx (candidate_id)`;
`skills_public_category_idx (category, skill_name)`.

#### `public.gaps_weaknesses` — honest gap framing

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | |
| `gap_type` | text NOT NULL | CHECK `in ('skill','experience','environment','role_type')` |
| `description` | text NOT NULL | |
| `why_its_a_gap` | text | private |
| `interest_in_learning` | boolean NOT NULL | default `false` |

Index: `gaps_weaknesses_candidate_id_idx (candidate_id)`.

#### `public.values_culture` — what matters at work (AI context, private)

`id`, `candidate_id` (FK, cascade), `created_at`, `must_haves`,
`dealbreakers`, `management_style_preferences`, `team_size_preferences`,
`how_handle_conflict`, `how_handle_ambiguity`, `how_handle_failure` — all
text. Index: `values_culture_candidate_id_idx (candidate_id)`.
**Never exposed publicly** (no `*_public` view; feeds the AI chat context).

#### `public.faq_responses` — FAQ for the AI chat (private)

`id`, `candidate_id` (FK, cascade), `created_at`, `question` (text NOT NULL),
`answer` (text NOT NULL), `is_common_question` (boolean default `false`),
`labels` (text[] default `'{}'`). Index: `faq_responses_candidate_id_idx
(candidate_id)`. Not exposed publicly.

#### `public.ai_instructions` — honesty/tone/boundaries rules for the AI (private)

`id`, `candidate_id` (FK, cascade), `created_at`, `instruction_type` (text
NOT NULL, CHECK `in ('honesty','tone','boundaries')`), `instruction` (text
NOT NULL), `priority` (integer default `0`). Index:
`ai_instructions_candidate_id_idx (candidate_id)`. Not exposed publicly.

#### `public.recommendations` — testimonials

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `candidate_id` | uuid NOT NULL | FK → `candidate_profile(id)` ON DELETE CASCADE |
| `recommender_name` | text NOT NULL | |
| `recommender_title` | text NOT NULL | |
| `recommender_company` | text NOT NULL | |
| `recommendation_text` | text NOT NULL | original (reference: Polish) |
| `recommendation_text_en` | text | English translation, written by the `translate-recommendation` edge function; view serves `COALESCE(en, original)` |
| `tags` | text[] | default `'{}'` |
| `is_public` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at` | timestamptz NOT NULL | |

Indexes: `recommendations_candidate_id_idx (candidate_id)`;
`recommendations_public_order_idx (display_order) WHERE is_public = true`.

### 2.2 Content / knowledge-base domain

#### `public.content_collections` — hub containers

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | e.g. `services`, `expertise`, `articles`, `experience`, `certifications`, `technologies`, `speaking`, `glossary`, `resources` |
| `base` | text NOT NULL | URL path segment (equals `key` in the reference) |
| `sort_order` | integer NOT NULL | default `0` |
| `publish_status` | text NOT NULL | default `'published'` (`draft`/`published`) |
| `hub` | jsonb NOT NULL | default `'{}'`; keys: `h1`, `description` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `content_collections_public_order_idx (sort_order) WHERE
publish_status = 'published'`. Trigger: `set_updated_at`.

#### `public.content_docs` — knowledge-base documents

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `collection_key` | text NOT NULL | FK → `content_collections(key)` ON DELETE CASCADE |
| `slug` | text NOT NULL | unique per collection: `UNIQUE (collection_key, slug)` |
| `sort_order` | integer NOT NULL | default `0` |
| `publish_status` | text NOT NULL | default `'published'` |
| `doc` | jsonb NOT NULL | default `'{}'`; the whole document — see ContentDoc shape (§6) |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Indexes: `content_docs_collection_idx (collection_key, sort_order)`;
`content_docs_public_collection_order_idx (collection_key, sort_order) WHERE
publish_status = 'published'`;
`content_docs_public_route_idx (collection_key, slug) WHERE publish_status =
'published'`; `content_docs_public_related_idx gin ((doc -> 'related')) WHERE
publish_status = 'published'`; `content_docs_public_tags_idx gin ((doc ->
'tags')) WHERE publish_status = 'published'`. Trigger: `set_updated_at`.

#### `public.site_content` — editable UI text values

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | e.g. `spotlight.name`, `disclaimer.text`, `footer.contact` |
| `group_name` | text NOT NULL | default `'general'` |
| `label` | text NOT NULL | default `''` (admin UI label) |
| `notes` | text | |
| `value` | text NOT NULL | default `''` |
| `publish_status` | text NOT NULL | default `'published'` |
| `sort_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `site_content_public_order_idx (sort_order) WHERE publish_status =
'published'`. Trigger: `set_updated_at`.

#### `public.site_sections` — homepage section registry

`id` (uuid PK), `section_key` (text NOT NULL UNIQUE), `label` (text NOT
NULL), `description` (text default `''`), `is_visible` (boolean default
`true`), `display_order` (integer default `0`), `created_at`, `updated_at`.
Partial index: `site_sections_visible_order_idx (display_order) WHERE
is_visible = true`. Trigger: `set_updated_at`. Seed rows (adapt wording):
`spotlight`, `experience`, `skills`, `jd`, `testimonials`, `transparency`,
`disclaimer`, `footer`, `fun`.

#### `public.fun_links` — just-for-fun links

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `href` | text NOT NULL | |
| `title` | text NOT NULL | |
| `description` | text NOT NULL | default `''` |
| `tag` | text NOT NULL | default `''` |
| `icon` | text NOT NULL | default `'terminal'` (icon key from the icon set) |
| `is_active` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `fun_links_active_order_idx (display_order) WHERE is_active =
true`. Trigger: `set_updated_at`.

#### `public.holiday_banners` — recurring seasonal banners

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `banner_key` | text NOT NULL UNIQUE | e.g. `newyear`, `christmas`, `sysadmin-day` |
| `emoji` | text NOT NULL | default `'🎉'` |
| `message` | text NOT NULL | |
| `gradient_from`, `gradient_via`, `gradient_to` | text NOT NULL | HSL triplets, default `'210 60% 30%'` / `'225 50% 35%'` / `'240 60% 30%'` |
| `particles` | text[] NOT NULL | default `ARRAY['✨','🎉','⭐']` |
| `dismiss_animation` | text NOT NULL | default `'burst'` (`burst`/`fade`/`confetti`) |
| `start_date`, `end_date` | date NOT NULL | active window |
| `is_active` | boolean NOT NULL | default `true` |
| `display_order` | integer NOT NULL | default `0` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

Partial index: `holiday_banners_active_window_idx (start_date, end_date,
display_order) WHERE is_active = true`. Trigger: `set_updated_at`. Seed rows
live in the migrations (New Year, HR Day, Christmas, System Administrator
Day, Programmer Day, Computer Security Day, Password Day, Safer Internet
Day, ...) — adapt dates to your persona.

### 2.3 AI / cache / operations domain

#### `public.rate_limits` — per-IP per-function sliding windows

`id` (uuid PK), `ip_address` (text NOT NULL), `function_name` (text NOT
NULL), `window_start` (timestamptz NOT NULL default `now()`), `call_count`
(integer NOT NULL default `1`). Index: `idx_rate_limits_lookup (ip_address,
function_name, window_start)`. RLS: deny-all, service role only (written by
the SECURITY DEFINER function). Rows older than **1 hour** are deleted inside
`check_rate_limit` and by an hourly `pg_cron` job (GDPR data minimization).

#### `public.chat_response_cache` — AI chat response cache

`id` (uuid PK), `question_hash` (text NOT NULL UNIQUE), `question` (text NOT
NULL), `ai_response` (text NOT NULL), `created_at` (timestamptz NOT NULL
default `now()`). RLS: deny-all; accessed only via `get_chat_cache` /
`set_chat_cache` (service role). TTL 48h.

#### `public.jd_analysis_cache` — job-description analysis cache

`id` (uuid PK), `jd_hash` (text NOT NULL UNIQUE), `job_description` (text NOT
NULL), `analysis_result` (jsonb NOT NULL), `created_at`. RLS: deny-all;
accessed only via `get_jd_cache` / `set_jd_cache` (service role). TTL 7 days.

#### `public.rag_metrics` — AI usage + abuse-watchdog metrics

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz NOT NULL | |
| `function_name` | text NOT NULL | `chat`, `analyze-jd`, `generate-cv`, ... |
| `cache_hit` | boolean NOT NULL | default `false` |
| `topics_activated` | text[] | default `'{}'` |
| `prompt_chars` | integer NOT NULL | default `0` |
| `input_tokens`, `output_tokens` | integer | |
| `question_preview` | text | truncated to 100 chars by `insert_rag_metric` |

RLS: deny-all; written by edge functions via `insert_rag_metric` (service
role). Auto-cleanup: rows older than 30 days deleted on each insert.

#### `public.cv_settings` — CV generator configuration (public read)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `singleton_key` | text NOT NULL UNIQUE | default `'default'` |
| `headline_title`, `subtitle`, `summary` | text NOT NULL | default `''` |
| `achievements` | text[] NOT NULL | default `'{}'` |
| `skills_keywords` | text[] NOT NULL | default `'{}'` |
| `certifications`, `education` | text[] NOT NULL | default `'{}'` |
| `details` | jsonb NOT NULL | default `'{}'` (roles/experience detail) |
| `earlier_note`, `interactive_note`, `banner_note`, `footer_note` | text NOT NULL | default `''` (extra CV sections) |
| `site_url` | text NOT NULL | default `'zabrowski.pl'` |
| `creation_prompt` | text NOT NULL | default `''` — admin-editable custom rules appended to the `generate-cv` system prompt ("CUSTOM RULES" section); must NOT embed the CV data block (that is appended automatically) |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

RLS: public read policy (`FOR SELECT USING (true)` — the CV is meant to be
publicly downloadable), admin writes. Trigger: `set_updated_at`. Keep the
`anon` SELECT grant — `generate-cv` reads this table with the anon client.

#### `public.cv_documents` — generated CV/PDF cache

`id` (uuid PK), `source_hash` (text NOT NULL UNIQUE), `pdf_base64` (text NOT
NULL), `generated_at` (timestamptz NOT NULL default `now()`). RLS: deny-all;
service role only.

#### `public.abuse_alerts` — abuse-watchdog inbox (admin panel)

`id` (uuid PK), `created_at` (timestamptz NOT NULL default `now()`),
`window_minutes` (integer NOT NULL), `alert_type` (text NOT NULL), `detail`
(text NOT NULL), `acknowledged_at` (timestamptz). Index:
`abuse_alerts_created_at_idx (created_at desc)`. RLS: admin `SELECT`/`UPDATE`
(acknowledge) via `is_admin()`; inserts by the scheduled `abuse-alert` edge
function (service role). Grants: `SELECT, UPDATE` to `authenticated`, `ALL`
to `service_role`, nothing to `anon`.

---

## 3. Public views (`public.*_public`)

All views below are read-only surfaces for the site. They are
`WITH (security_invoker = on, security_barrier = true)` wrappers over the
`private.api_*` views (§5) — the wrapper applies the caller's RLS while the
private view (security barrier) prevents leaking unpublished rows through
leaky joins. `anon` and `authenticated` get `SELECT`; `service_role` also
gets `SELECT` (edge functions). Writes on views are revoked for all roles.

| View | Projected columns |
|---|---|
| `candidate_profile_public` | `id, name, title, elevator_pitch, availability_status, target_company_stages, linkedin_url` |
| `experiences_public` | `id, candidate_id, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, display_order` |
| `skills_public` | `id, candidate_id, skill_name, category, self_rating, years_experience` |
| `gaps_weaknesses_public` | `id, candidate_id, gap_type, description, interest_in_learning` |
| `recommendations_public` | `id, candidate_id, recommender_name, recommender_title, recommender_company, recommendation_text` (= `COALESCE(recommendation_text_en, recommendation_text)`), `original_text`, `is_translated`, `display_order` — only `is_public = true` rows |
| `site_content_public` | `key, group_name, value` — only `publish_status = 'published'` |
| `content_collections_public` | `key, base, sort_order, hub, updated_at` — only `publish_status = 'published'` |
| `content_docs_public` | `id, collection_key, slug, sort_order, doc, updated_at` — only when doc AND parent collection are `published` |

---

## 4. Read RPCs (called by the site with the anon/publishable key)

All are `security invoker`, `set search_path = ''`, `GRANT EXECUTE` to
`anon, authenticated`, revoked from `public`.

| Function | Returns | Purpose |
|---|---|---|
| `get_public_homepage_data()` | jsonb | One-call homepage payload: `profile`, `experiences` (ordered `start_date desc nulls last`), `skills`, `gaps`, `recommendations`, `siteSections` (visible only), `funLinks` (active only), `holidayBanner` (single active banner in window, ordered by `display_order`) |
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
`api_content_collections_public`, `api_content_docs_public`.
`SELECT` granted to `anon`, `authenticated`, `service_role`; revoked from
`public`.

Monitoring RPCs live in `private` as SECURITY DEFINER bodies:
`private.get_monitoring_stats()`, `private.get_cache_sizes()`,
`private.get_database_size()` (admin-guarded with `is_admin()`), with thin
`public` `security invoker` wrappers. In the hardened reference the public
wrappers are **revoked from anon/authenticated** — service-role/operator use
only (the site never calls them; keep them out of the client bundle).

---

## 6. ContentDoc JSONB shape (`content_docs.doc`)

```jsonc
{
  "h1": "Document title",          // rendered <h1>, required
  "label": "Short nav label",      // fallback: h1
  "description": "SEO/related-link blurb",
  "intro": "Lead paragraph",
  "tags": ["tag-a", "tag-b"],      // used for related-link tag matching
  "related": ["collection/slug", "other/collection/slug"], // direct refs
  "faqs": [{ "q": "...", "a": "..." }],
  "blocks": [
    { "type": "p", "text": "..." },
    { "type": "h2", "text": "..." },
    { "type": "h3", "text": "..." },
    { "type": "list", "ordered": false, "items": ["...", "..."] },
    { "type": "steps", "items": [{ "title": "Step title", "text": "Step text" }] },
    { "type": "table", "caption": "...", "headers": ["..."], "rows": [["..."]] },
    { "type": "checklist", "title": "...", "items": ["...", "..."] },
    { "type": "callout", "title": "...", "text": "..." },
    { "type": "diagram", "diagram": "<diagram-key>", "caption": "..." },
    { "type": "rich", "html": "<p>sanitized allow-list HTML</p>" }
  ]
}
```

`rich` HTML is sanitized server-side (parse5 allow-list: `img` http(s) only,
no `data:` URIs, no SVG) at read time. The admin TipTap editor produces
`blocks`; the AI generation functions produce the same shape.

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
| `insert_rag_metric` | `(p_function_name text, p_cache_hit boolean, p_topics_activated text[], p_prompt_chars integer, p_input_tokens integer default null, p_output_tokens integer default null, p_question_preview text default null) → void` | truncates preview to 100 chars; deletes > 30 days |
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

### pg_cron

`cleanup-rate-limits` — hourly `DELETE FROM public.rate_limits WHERE
window_start < now() - interval '1 hour'` (safety net; the function already
cleans on each call). Requires the `pg_cron` extension (schema
`pg_catalog`).

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

Uploads are UUID-filename; the sanitizer allow-list (`<img>` http(s) only, no
`data:` URIs) applies at render time.

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
| `generate-cv` | Turnstile-gated CV/PDF generation (server-side siteverify, hyphenated error codes); reads `cv_settings` with the anon client; PDF cached in `cv_documents` | `cv_settings` read (anon), `cv_documents` write (service role), `check_rate_limit`, `insert_rag_metric` |
| `generate-doc-content` | Admin: DeepSeek generates draft doc content (blocks) for the KB editor | reads/writes via authenticated admin JWT |
| `generate-doc-tags` | Admin: DeepSeek suggests tags for a doc | admin JWT |
| `generate-faq-labels` | Admin: DeepSeek suggests FAQ labels | admin JWT |
| `translate-recommendation` | Admin: DeepSeek translates a recommendation to English → writes `recommendations.recommendation_text_en` (view then serves `COALESCE(en, original)` + `is_translated`) | authenticated admin JWT |
| `get-contact` | Public contact endpoint: `GET /functions/v1/get-contact` → `candidate_profile_public` fields (`name, title, elevator_pitch, availability_status, linkedin_url, target_company_stages`); 404 when no profile row; contact info never includes email/phone | `candidate_profile_public` read |
| `sitemap` | Dynamic `sitemap.xml` from the catalog (published docs only) — crawlers see publish/unpublish without redeploy | `get_public_sitemap_data()` |
| `abuse-alert` | Scheduled watchdog (every 15 min via `supabase/config.toml` `schedule = "*/15 * * * *"`): aggregates `rag_metrics` over the window, compares against env thresholds (`ABUSE_WINDOW_MINUTES`, `ABUSE_MAX_CALLS_CHAT/JD/CV`, `ABUSE_MAX_TOKENS`), writes breaches to `abuse_alerts`; optional non-sensitive webhook mirror (`ABUSE_ALERT_WEBHOOK_URL` — counts only, never question text/PII) | `rag_metrics` read, `abuse_alerts` write |

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

Explicit service-role grants the migrations add (idempotent, additive):

- `USAGE ON SCHEMA private`; `SELECT` on all `private.api_*` views.
- `SELECT` on all `public.*_public` views.
- `EXECUTE` on `check_rate_limit`, `get/set_chat_cache`, `get/set_jd_cache`,
  `insert_rag_metric`, `is_admin`.
- `ALL` on `abuse_alerts`.

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
| Site chrome | `site_sections`, `fun_links`, `holiday_banners` | direct `SELECT` via RLS (`is_visible`/`is_active`/active window) — these are simple public registries, no views | same + `is_admin()` CRUD | bypasses RLS |
| CV | `cv_settings`, `cv_documents` | `cv_settings`: `SELECT` via policy `USING (true)` (public CV content); `cv_documents`: denied (deny-all) | `cv_settings`: `is_admin()` writes; `cv_documents`: denied | bypasses RLS |
| Ops | `rate_limits`, `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`, `abuse_alerts` | denied (deny-all policies; `abuse_alerts` additionally has explicit REVOKEs) | denied (`abuse_alerts`: admin `SELECT`/`UPDATE` only) | bypasses RLS |

Grant hygiene (from the hardening migrations, keep them):

- Revoke `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` on all
  `public.*_public` views from `anon, authenticated, public` — the view layer
  is read-only.
- Revoke dead write grants on deny-all tables and on admin tables from `anon`.
- Keep `authenticated` write grants on admin tables — the RLS model depends
  on them (Postgres enforces grants AND policies; the admin JWT write path
  needs both).
- Keep the `anon` `SELECT` on `cv_settings` — `generate-cv` reads it with the
  anon client. Before revoking any "dead" grant, grep edge functions for the
  table (this exact mistake broke `generate-cv` once; see
  `INCIDENT-20260824-cv-settings-grant.md` in the reference notes).
- `EXECUTE` on cache/utility RPCs: `service_role` only. `is_admin()`:
  `authenticated` (RLS uses it via SECURITY DEFINER regardless).

---

## 11. Applying and verifying

1. Commit migrations under `supabase/migrations/` with timestamped names
   (`YYYYMMDDHHMMSS_description.sql`).
2. `supabase db push` (or Management API / dashboard SQL editor) — aligns
   local with remote.
3. Gate:
   - **RLS enumeration (§12)** — every table RLS-enabled, anon write denied
     on EVERY base table (raw client test per table, not just one), anon
     base-table `SELECT` denied except the documented public registries;
   - anon can `SELECT` every `public.*_public` view and call every
     `get_public_*` RPC;
   - admin JWT can write (admin panel CRUD works);
   - `kb-images`: anon URL fetch 200, anon listing `[]`, admin upload works;
   - signup with foreign-domain email → rejected; `@<your-domain>` → allowed;
   - `check_rate_limit` returns true then false past the cap.
4. Apply migrations **before** deploying schema-dependent Worker changes —
   deploy workflows never run migrations.

---

## 12. Final RLS audit (run before launch and after EVERY schema change)

The RLS model is the security boundary — audit it with SQL, never by
eyeballing. Run these queries in the Supabase SQL Editor and check every row
against the matrix in §10.

**A. Every base table must have RLS enabled:**

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

Every row must show `rls_enabled = true` (there are 21 tables in this
schema). Any `false` is a launch blocker.

**B. anon/authenticated grants on BASE tables (must match §10):**

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name not like '%\_public'   -- base tables only; views are C
order by table_name, grantee, privilege_type;
```

Expected: `authenticated` has CRUD on admin tables; `anon` has `SELECT` only
on the public registries (`site_sections`, `fun_links`, `holiday_banners`,
`cv_settings`) and nothing else. Any anon `INSERT/UPDATE/DELETE`, and any
grant on the deny-all tables (`rate_limits`, `chat_response_cache`,
`jd_analysis_cache`, `rag_metrics`, `cv_documents`, `abuse_alerts`), is a
launch blocker.

**C. View layer is read-only (for the API roles):**

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like '%\_public'
  and grantee in ('anon', 'authenticated', 'public')
  and privilege_type <> 'SELECT'
order by table_name, grantee;
```

Must return **zero rows**. Note: the **owner** (`postgres`) and
`service_role` legitimately hold write grants on views — the owner always
retains ALL privileges and the service role has Supabase's default `ALL`.
They are NOT part of this check; only anon/authenticated/public write grants
on the view layer are launch blockers (they would let a client write
through an auto-updatable view).

**D. Write-RPC EXECUTE grants — only the owner and service_role may have
them (no anon/authenticated/public):**

```sql
select p.proname, g.grantee
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) g
where n.nspname = 'public'
  and p.proname in ('check_rate_limit','get_chat_cache','set_chat_cache',
                    'get_jd_cache','set_jd_cache','insert_rag_metric')
  and g.grantee in ('anon', 'authenticated', 'public')
order by p.proname;
```

Must return **zero rows**. The owner implicitly holds EXECUTE and
`service_role` is granted explicitly — neither is a finding; any
anon/authenticated/public EXECUTE on the cache/rate-limit RPCs is a launch
blocker.

**E. Deny-all policies still deny (show the actual qualifiers):**

```sql
select tablename, policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('rate_limits','chat_response_cache','jd_analysis_cache',
                    'rag_metrics','cv_documents')
order by tablename, policyname;
```

Each table must have a deny-all policy (`cmd = 'ALL'`, `qual` = `false`,
`roles` covering all roles). Inspect the `qual`/`roles` columns — do not
assume from the policy name alone.

**F. Policy inventory — every policy on every base table, human-checked
against §10:** the checks above cover grants; policies are what actually
gate rows. Run this and verify each row matches the matrix (admin tables
must have NO permissive policy allowing non-admin `authenticated` access —
look for `is_admin()` in the qual of every admin-table policy):

```sql
select tablename, policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('candidate_profile','experiences','skills',
                    'gaps_weaknesses','values_culture','faq_responses',
                    'ai_instructions','recommendations','content_collections',
                    'content_docs','site_content','site_sections','fun_links',
                    'holiday_banners','cv_settings')
order by tablename, policyname;
```

Specific things to verify by eye: `values_culture`/`faq_responses`/
`ai_instructions` have NO policy allowing `anon` or unrestricted
`authenticated` reads; `candidate_profile`/`experiences`/`skills`/
`gaps_weaknesses`/`recommendations`/content tables have no `FOR SELECT TO
anon USING (true)`; the public registries' read policies restrict rows
(`is_visible`/`is_active`/window); `cv_settings` read policy is
`USING (true)` by design.

**G. Behavioral probe (REST, two keys):**

1. **anon** (publishable key): for EVERY table in §10 attempt `INSERT`,
   `UPDATE`, `DELETE` and expect `401/403`. `SELECT` on base tables:
   expected failures on profile/content/ops families; allowed only on the
   public registries + `cv_settings`.
2. **authenticated non-admin** (any non-admin user's JWT — create a throwaway
   account): reads on the private tables (`values_culture`,
   `faq_responses`, `ai_instructions`) must FAIL; writes on admin tables
   must FAIL; reads on public views must SUCCEED. A permissive
   `is_admin()` typo or a missing `is_admin()` check is exactly what this
   probe catches — do not skip it.

Automate B–G in a script (`scripts/audit-rls.mjs`) so the Phase 8 RLS audit
in the skill is one command; the script's expected output is the §10 matrix
with zero deviations.

Reference files in the source project: `supabase/migrations/*.sql`
(authoritative DDL), `supabase/config.toml` (edge-function schedules,
`verify_jwt = false`), `supabase/functions/_shared/deepseek.ts` +
`_shared/http.ts` (shared clients).
