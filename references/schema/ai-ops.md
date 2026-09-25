# Schema — AI / cache / operations domain

> **Holds:** the AI/cache/operations tables defined in the source §2.3 — `rate_limits`,
> `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`, `cv_settings`, `cv_documents`,
> `abuse_alerts`.
> **Loaded at:** Build — data layer (AI + ops); Publish/Operate for the abuse watchdog and the CV
> cache.
> **Source:** `DATABASE_SCHEMA.md` §2.3, verbatim, including the 2026-09-25 hardening revision.
> **Cross-references:** read RPCs (§4), functions/triggers (§7), storage (§8), edge functions +
> service-role access matrix (§9) and the RLS/grants matrix (§10) → `access.md`; §12 audit →
> `audit.md`.

---

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
NULL), `ai_response` (text NOT NULL), `cache_version` (text NOT NULL — model id,
system-prompt hash, context hash and policy version concatenated),
`created_at` (timestamptz NOT NULL default `now()`). RLS: deny-all; accessed only
via `get_chat_cache` / `set_chat_cache` (service role). TTL 48h.

Cache rules, all enforced in the functions: the lookup key includes
`cache_version`, so a model, prompt, context or policy change is a cache miss
rather than a stale answer; a response that trips a safety or leakage check is
**never written** to the cache; `values_culture`, `faq_responses` and
`ai_instructions` changes purge the cache (`cache_version` changes with the
context hash, and the `purge_ai_caches` trigger below deletes the rows); and a
cache hit is validated exactly like a fresh response, never trusted because it was
cached. Store the hash of the question, not the raw text, wherever the hash is
enough to answer.

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
| `question_preview` | text | non-identifying preview derived by `insert_rag_metric`: truncated to 100 chars **after** PII scrubbing (email addresses, phone/ID-like digit runs, URLs and their query strings removed); `NULL` when nothing survives the scrub |

RLS: deny-all; written by edge functions via `insert_rag_metric` (service
role). Auto-cleanup: rows older than **7 days** deleted on each insert, plus a
daily `pg_cron` sweep (§7). **Raw user text is never stored here** — the
preview is an abuse signal, not a transcript. The minimization rule and its
legal basis are recorded in an ADR.

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
| `creation_prompt` | text NOT NULL | default `''` — admin-editable custom rules appended to the `generate-cv` system prompt ("CUSTOM RULES" section); must NOT embed the CV data block (that is appended automatically). **Operator-only: never projected by `cv_settings_public`** |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

RLS: the base table is read only through admin access (`is_admin()` policy +
the `authenticated` grant); the public CV content (the CV is meant to be
publicly downloadable) is served by the `cv_settings_public` view, which omits
`creation_prompt`. `anon` holds **no** grant on the base table. Admin writes.
Trigger: `set_updated_at`; a second `AFTER UPDATE/DELETE` trigger purges
`cv_documents` (§7), so a settings edit cannot serve a stale PDF. `generate-cv`
reads the base table with the **service-role** client (it needs
`creation_prompt`); the browser reads only the view.

#### `public.cv_documents` — generated CV/PDF cache

`id` (uuid PK), `source_hash` (text NOT NULL UNIQUE), `pdf_base64` (text NOT
NULL), `generated_at` (timestamptz NOT NULL default `now()`). RLS: deny-all;
service role only.

`source_hash` is computed over the **whole CV input** — every projected
`cv_settings` column including `creation_prompt`, plus the profile/experience
data the PDF embeds — so any settings or content change produces a new hash and
a cache miss, and a cached PDF is never served for changed input. The
`cv_settings` update trigger purges the cache anyway (§7), and a daily
`pg_cron` sweep drops rows older than 30 days (a regenerable cache, never a
record).

#### `public.admin_audit` — append-only administrative audit trail

`id` (uuid PK), `at` (timestamptz NOT NULL default `now()`), `actor_id` (uuid,
`auth.uid()` or NULL for the service role), `actor_email` (text),
`operation` (text NOT NULL — `INSERT`/`UPDATE`/`DELETE`), `table_name` (text NOT
NULL), `row_id` (text), `request_id` (text — never a token or a body),
`before_hash`, `after_hash` (text, `md5(row::text)`, NULL on the side that does
not exist). Index: `admin_audit_at_idx (at desc)`.

RLS: **no policy for `anon` or `authenticated`**; the admin panel reads through a
`security definer` RPC guarded by `is_admin()`, and rows are written only by the
`public.audit_admin_change()` trigger (SECURITY DEFINER). No API role holds
`UPDATE` or `DELETE`, and the trigger raises on an attempt to modify or delete an
existing row — a compromised admin session can act, but cannot quietly erase the
record of acting. `audit_admin_change()` is attached
(`AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW`) to `candidate_profile`,
`experiences`, `skills`, `gaps_weaknesses`, `recommendations`, `values_culture`,
`faq_responses`, `ai_instructions`, `content_collections`, `content_docs`,
`site_content`, `site_sections`, `fun_links`, `holiday_banners` and
`cv_settings`. Content hashes only — never a copy of the row. Retention 400 days,
exported off-platform before pruning (`references/operate.md` §4.1).

#### `public.abuse_alerts` — abuse-watchdog inbox (admin panel)

`id` (uuid PK), `created_at` (timestamptz NOT NULL default `now()`),
`window_minutes` (integer NOT NULL), `alert_type` (text NOT NULL), `detail`
(text NOT NULL), `acknowledged_at` (timestamptz). Index:
`abuse_alerts_created_at_idx (created_at desc)`. RLS: admin `SELECT`/`UPDATE`
(acknowledge) via `is_admin()`; inserts by the scheduled `abuse-alert` edge
function (service role). Grants: `SELECT, UPDATE` to `authenticated`, `ALL`
to `service_role`, nothing to `anon`.

**`detail` is a summary, not evidence.** It carries counts, thresholds,
window sizes, rates, timestamps and function names only. It never carries
question text, user content, IP addresses, email addresses or any other
identifier — otherwise it would defeat the `rag_metrics` minimization above.
The `abuse-alert` writer builds `detail` from aggregates and rejects (does not
write) anything that does not match that shape.
