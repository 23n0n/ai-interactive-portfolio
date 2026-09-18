# Schema — AI / cache / operations domain

> **Holds:** the AI/cache/operations tables defined in the source §2.3 — `rate_limits`,
> `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`, `cv_settings`, `cv_documents`,
> `abuse_alerts`.
> **Loaded at:** Build — data layer (AI + ops); Publish/Operate for the abuse watchdog and the CV
> cache.
> **Source:** `DATABASE_SCHEMA.md` §2.3, verbatim — the schema is unchanged.
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
