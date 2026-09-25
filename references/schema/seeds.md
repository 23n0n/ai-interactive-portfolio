# Schema — Seeds and migration ordering

> **Holds:** the seed-row **values** for `site_sections` and `holiday_banners` (declared relocations
> R1/R2 from source §2.2) and migration ordering and verification (source §11).
> **Loaded at:** Build — migrations stage, before `supabase db push`.
> **Source:** `DATABASE_SCHEMA.md` §2.2 (the two declared seed-value relocations reproduced below)
> and §11, byte-identical, including the 2026-09-25 hardening revision. The source's closing
> reference-files paragraph (source §12, lines 1049–1052) is reproduced at the end of §12 in
> [`audit.md`](audit.md).
> **Cross-references:** the profile domain is deliberately not seeded — see the §2.1 population note
> in `profile.md`; **§12 final RLS audit → `audit.md`**; table definitions → `profile.md`,
> `content.md`, `ai-ops.md`. The source's own seed pointer lines stay in `content.md` and point here.

---

## Declared relocations from source §2.2 (byte-identical)

The lines below are the **only** §2.2 lines not reproduced in `content.md`. They are declared
relocations **R1** and **R2** (see `README.md` → "Declared relocations"). Each line is
byte-identical to `DATABASE_SCHEMA.md` (line numbers are the post-hardening-revision source
lines).

### R1 — `public.site_sections` seed values (source §2.2 lines 280–281)

`spotlight`, `experience`, `skills`, `jd`, `testimonials`, `transparency`,
`disclaimer`, `footer`, `fun`.

### R2 — `public.holiday_banners` seed values (source §2.2 lines 318–320)

live in the migrations (New Year, HR Day, Christmas, System Administrator
Day, Programmer Day, Computer Security Day, Password Day, Safer Internet
Day, ...) — adapt dates to your persona.

---

## Profile domain — not seeded

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
   local with remote. Keep the **migration inventory** — `supabase migration list` against the
   linked project — with the release: the schema history is complete and no migration is pending,
   and a pending migration blocks the release.
3. Gate:
   - **RLS enumeration (§12)** — every table RLS-enabled, anon write denied
     on EVERY base table (raw client test per table, not just one), anon
     base-table `SELECT` denied on EVERY base table — the public registries
     and `cv_settings` included; their public reads go through the views;
   - anon can `SELECT` every `public.*_public` view (registry and CV views
     included) and call every `get_public_*` RPC;
   - admin JWT can write (admin panel CRUD works);
   - `kb-images`: anon URL fetch 200, anon listing `[]`, admin upload works;
   - signup is disabled (`[auth] enable_signup = false`); a foreign-domain attempt is refused as defence in depth;
   - `check_rate_limit` returns true then false past the cap.
4. Apply migrations **before** deploying schema-dependent Worker changes —
   deploy workflows never run migrations.
