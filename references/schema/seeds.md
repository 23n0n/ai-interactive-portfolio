# Schema — Seeds and migration ordering

> **Holds:** the seed-row **values** for `site_sections` and `holiday_banners` (declared relocations
> R1/R2 from source §2.2) and migration ordering and verification (source §11).
> **Loaded at:** Build — migrations stage, before `supabase db push`.
> **Source:** `DATABASE_SCHEMA.md` §2.2 (the two declared seed-value relocations reproduced below)
> and §11, byte-identical — the schema is unchanged. The source's closing reference-files paragraph
> (source §12, lines 773–776) is reproduced at the end of §12 in [`audit.md`](audit.md).
> **Cross-references:** the profile domain is deliberately not seeded — see the §2.1 population note
> in `profile.md`; **§12 final RLS audit → `audit.md`**; table definitions → `profile.md`,
> `content.md`, `ai-ops.md`. The source's own seed pointer lines stay in `content.md` and point here.

---

## Declared relocations from source §2.2 (byte-identical)

The lines below are the **only** §2.2 lines not reproduced in `content.md`. They are declared
relocations **R1** and **R2** (see `README.md` → "Declared relocations"). Each line is
byte-identical to `DATABASE_SCHEMA.md`.

### R1 — `public.site_sections` seed values (source §2.2 lines 253–254)

`spotlight`, `experience`, `skills`, `jd`, `testimonials`, `transparency`,
`disclaimer`, `footer`, `fun`.

### R2 — `public.holiday_banners` seed values (source §2.2 lines 291–293)

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
