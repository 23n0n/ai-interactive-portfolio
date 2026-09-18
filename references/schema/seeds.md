# Schema — Seeds and migration ordering

> **Holds:** the seed rows for `site_sections` and `holiday_banners` (extracted verbatim from source
> §2.2); migration ordering and verification (source §11); the authoritative source files in the
> reference project.
> **Loaded at:** Build — migrations stage, before `supabase db push`.
> **Source:** `DATABASE_SCHEMA.md` §2.2 (seed lists) and §11 + closing reference-files note,
> verbatim — the schema is unchanged.
> **Cross-references:** the profile domain is deliberately not seeded — see the §2.1 population note
> in `profile.md`; **§12 final RLS audit → `audit.md`**; table definitions → `profile.md`,
> `content.md`, `ai-ops.md`.

---

## Seed rows

### `public.site_sections` — homepage section registry

Verbatim from `DATABASE_SCHEMA.md` §2.2 (`public.site_sections`):

> Seed rows (adapt wording):
> `spotlight`, `experience`, `skills`, `jd`, `testimonials`, `transparency`,
> `disclaimer`, `footer`, `fun`.

### `public.holiday_banners` — recurring seasonal banners

Verbatim from `DATABASE_SCHEMA.md` §2.2 (`public.holiday_banners`):

> Seed rows
> live in the migrations (New Year, HR Day, Christmas, System Administrator
> Day, Programmer Day, Computer Security Day, Password Day, Safer Internet
> Day, ...) — adapt dates to your persona.

### Profile domain — not seeded

The §2.1 population note (kept verbatim in `profile.md`) is explicit: the profile tables are NOT
seeded by migrations in the reference. There are no seed rows for `candidate_profile`,
`experiences`, `skills`, `gaps_weaknesses`, `values_culture`, `faq_responses`, `ai_instructions` or
`recommendations`; `cv_settings` is the only singleton mentioned by that note.

---

## Migration ordering and verification (source §11)

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

## Authoritative files in the reference project

Reference files in the source project: `supabase/migrations/*.sql`
(authoritative DDL), `supabase/config.toml` (edge-function schedules,
`verify_jwt = false`), `supabase/functions/_shared/deepseek.ts` +
`_shared/http.ts` (shared clients).
