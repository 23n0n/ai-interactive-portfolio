# Database Schema Reference

> **Holds:** the index for this reference — domain → file map, load order, and the original section
> map. No SQL lives here.
> **Loaded at:** Build — data-layer stage, before opening any domain file.
> **Source:** `DATABASE_SCHEMA.md`; the preamble below is verbatim and the schema is unchanged.

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

## Domain map

| Domain | File | Holds | Lifecycle stage that loads it |
|---|---|---|---|
| Profile | [`profile.md`](profile.md) | `candidate_profile`, `experiences`, `skills`, `gaps_weaknesses`, `values_culture`, `faq_responses`, `ai_instructions`, `recommendations` (source §2.1) | Build — data layer; these tables are read at runtime by the homepage, AI chat, JD analysis and CV generation |
| Content / knowledge base | [`content.md`](content.md) | `content_collections`, `content_docs`, `site_content`, `site_sections`, `fun_links`, `holiday_banners` (source §2.2) and the ContentDoc JSONB shape (source §6) | Build — data layer (content model); content authoring / Distribute for the shape in §6 |
| AI / cache / operations | [`ai-ops.md`](ai-ops.md) | `rate_limits`, `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`, `cv_settings`, `cv_documents`, `abuse_alerts` (source §2.3) | Build — data layer (AI + ops); Publish/Operate for the abuse watchdog and CV cache |
| Access layer | [`access.md`](access.md) | roles and conventions (§1), public views (§3), read RPCs (§4), `private` schema (§5), functions/triggers/hooks/cron (§7), storage bucket (§8), edge functions + service-role access matrix (§9), RLS/grants matrix (§10) | Build — data layer, security half; re-loaded at Publish for the security audit |
| Audit | [`audit.md`](audit.md) | the §12 final RLS audit, checks A–G | Publish — before launch and after every schema change |
| Seeds / migrations | [`seeds.md`](seeds.md) | seed rows for `site_sections` and `holiday_banners`; migration ordering and verification (§11); authoritative source files | Build — migrations stage, before `supabase db push` |

## Load order

1. `README.md` (this file) — orientation and domain map.
2. The domain file(s) for the current step: `profile.md`, `content.md`, `ai-ops.md` — table
   definitions only.
3. `access.md` — roles, views, RPCs, functions, triggers, storage, grants; load it before touching
   any table's security.
4. `seeds.md` — seed rows and the order migrations are applied.
5. `audit.md` — the launch / post-change RLS audit (checks A–G).

Nothing in `references/schema/` is a substitute for the committed migrations: migrations remain the
single source of truth (see the preamble above).

## Original section map

The headings below are the source document's own headings, unchanged. They are reproduced here so
the split loses no navigation.

| Source heading (verbatim) | New file |
|---|---|
| `# Database Schema Reference` | `README.md` (preamble) |
| `## 1. Roles and the access model` | `access.md` |
| `## 2. Tables` | `profile.md`, `content.md`, `ai-ops.md` |
| `### 2.1 Profile domain` + its `####` table headings | `profile.md` |
| `### 2.2 Content / knowledge-base domain` + its `####` table headings | `content.md` |
| `### 2.3 AI / cache / operations domain` + its `####` table headings | `ai-ops.md` |
| `## 3. Public views (public.*_public)` | `access.md` |
| `## 4. Read RPCs (called by the site with the anon/publishable key)` | `access.md` |
| `## 5. Private schema (private)` | `access.md` |
| `## 6. ContentDoc JSONB shape (content_docs.doc)` | `content.md` |
| `## 7. Functions, triggers, hooks, cron` | `access.md` |
| `## 8. Storage: bucket kb-images` | `access.md` |
| `## 9. Edge functions and the service-role access matrix` | `access.md` |
| `## 10. RLS and grants — summary matrix` | `access.md` |
| `## 11. Applying and verifying` | `seeds.md` |
| `## 12. Final RLS audit (run before launch and after EVERY schema change)` | `audit.md` |

## Cross-reference map

| Reference in the source | Now lives in |
|---|---|
| §1, §3, §4, §5, §7, §8, §9, §10 | `access.md` |
| §2.1 | `profile.md` |
| §2.2, §6 | `content.md` |
| §2.3 | `ai-ops.md` |
| §11 | `seeds.md` |
| §12 (audit A–G; `references/secure.md` points here) | `audit.md` |

Wherever the source text cites a §-number, the citation is kept and this table gives the file that
now holds it.
