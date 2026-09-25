# Schema — Final RLS audit (source §12, checks A–G)

> **Holds:** the §12 final RLS audit, checks A–G, to be run before launch and after every schema
> change. Self-sufficient for the A–G assertions: each check carries its own SQL and its expected
> result. Includes the source §12 closing reference-files paragraph.
> **Loaded at:** Build — data layer (part of `schema/*`); run before launch and after every schema change.
> **Source:** `DATABASE_SCHEMA.md` §12, verbatim, including the 2026-09-25 hardening revision.
> **Cross-references:** the §10 RLS and grants summary matrix that A–G check against, and the §9
> service-role access matrix (including the explicit service-role grants), are in `access.md`.
> `references/secure.md` points at this file for the A–G assertions. Seed values → `seeds.md`.

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

Every row must show `rls_enabled = true` (there are 22 tables in this
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

Expected: `authenticated` has CRUD on admin tables; `anon` has **no row at
all** — its reads are `SELECT` on `*_public` views, which the filter above
excludes, so any base-table grant to `anon` is a launch blocker. Any anon
`INSERT/UPDATE/DELETE`, and any grant on the deny-all tables
(`rate_limits`, `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`,
`cv_documents`), is a launch blocker too.

**C. View layer is read-only (for the API roles):**

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like '%\_public'
  and lower(grantee) in ('anon', 'authenticated', 'public')
  and privilege_type <> 'SELECT'
order by table_name, grantee;
```

Must return **zero rows**. Note: the **owner** (`postgres`) and
`service_role` legitimately hold write grants on views — the owner always
retains ALL privileges and the service role has Supabase's default `ALL`.
They are NOT part of this check; only anon/authenticated/public write grants
on the view layer are launch blockers (they would let a client write
through an auto-updatable view).

> **Catalog trap in C:** `information_schema.role_table_grants.grantee` is
> text-like and the `anon`/`authenticated` role names are lowercase in
> Postgres, but `PUBLIC` appears in that view as the uppercase literal
> `'PUBLIC'`. A filter listing lowercase `'public'` therefore matches
> nothing, which is why the comparison above is `lower(grantee)`.

**D. Write-RPC EXECUTE grants — only the owner and service_role may have
them (no anon/authenticated/public):**

```sql
select p.proname,
       case when g.grantee = 0 then 'public' else pg_get_userbyid(g.grantee) end as grantee
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) g
where n.nspname = 'public'
  and p.proname in ('check_rate_limit','get_chat_cache','set_chat_cache',
                    'get_jd_cache','set_jd_cache','insert_rag_metric')
  and (g.grantee = 0 or pg_get_userbyid(g.grantee) in ('anon', 'authenticated'))
order by p.proname;
```

Must return **zero rows**. The owner implicitly holds EXECUTE and
`service_role` is granted explicitly — neither is a finding; any
anon/authenticated/public EXECUTE on the cache/rate-limit RPCs is a launch
blocker.

> **Catalog traps in D:** `aclexplode()` exposes `grantee` as `oid`, not
> text, so comparing it directly to `'anon'` raises
> `invalid input syntax for type oid` and the query never returns. `PUBLIC`
> is oid **0**, and `pg_get_userbyid(0)` returns `unknown (OID=0)`, **not**
> `'public'`, so a filter spelled `pg_get_userbyid(g.grantee) = 'public'`
> silently misses every `PUBLIC` grant. That matters here because a function
> whose ACL was never revoked from `PUBLIC` shows up only through
> `coalesce(p.proacl, acldefault('f', p.proowner))`; the `g.grantee = 0` arm
> is what catches it. The `case` in the select list prints `'public'`
> instead of a bare oid.

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
                    'holiday_banners','cv_settings','abuse_alerts')
order by tablename, policyname;
```

Specific things to verify by eye: `values_culture`/`faq_responses`/
`ai_instructions` have NO policy allowing `anon` or unrestricted
`authenticated` reads; `candidate_profile`/`experiences`/`skills`/
`gaps_weaknesses`/`recommendations`/content tables have no `FOR SELECT TO
anon USING (true)`; the registry tables (`site_sections`, `fun_links`,
`holiday_banners`) and `cv_settings` carry **no** public read policy — their
base-table read policies are `is_admin()` only, and the visible/active/window
row filters plus the `creation_prompt` exclusion live in the `private.api_*`
views behind the public view wrappers.

**G. Behavioral probe (REST, two keys):**

1. **anon** (publishable key): for EVERY table in §10 attempt `INSERT`,
   `UPDATE`, `DELETE` and expect `401/403`. `SELECT` on base tables must
   **fail on every one of them**, registries and `cv_settings` included; the
   same key must succeed on every `*_public` view and every `get_public_*`
   RPC. A base-table `SELECT` that succeeds is a launch blocker.
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
