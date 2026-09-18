# Secure — security defaults, RLS audit, verification gate

Security material is inherited from the old kit **unchanged**. This file re-homes it; it does not
rewrite, weaken or summarize away any control. Do not invent controls, do not relax a rule without
a compensating control, do not accept a risk without an ADR.

Reference `DATABASE_SCHEMA.md` sections by number (P2 target: `references/schema/`). Do not copy
full DDL here. SQL, identifiers, env var names, header names and error strings below are exact —
keep them exact.

## 1. Threat model, stated plainly

**Rate limits, input caps, response caching and Turnstile protect against abuse and excessive AI
use — not against a determined attacker.** The **RLS model** (views + grants + policies) is the
actual security boundary of the site.

Hard rules:

1. Never present the abuse controls as attack protection. They limit abuse; they do not stop an
   attacker.
2. Treat the RLS model as the boundary. Audit it with SQL, never by eyeballing.
3. The final RLS audit is **mandatory, not optional** — it gates launch and every schema change.
4. CORS is browser-only. Edge functions are publicly reachable endpoints; CORS alone is not access
   control. Rate limits / Turnstile / JWT checks are the actual access control there.

## 2. Security defaults — always on

Every control below is always on. Partial control needs a compensating control; risk acceptance
needs an ADR.

1. **RLS everywhere.** Row Level Security enabled on every base table.
2. **anon = public read-only views.** `anon` reaches `public.*_public` views and `get_public_*`
   RPCs, plus the documented public registries (`site_sections`, `fun_links`, `holiday_banners`)
   and public `cv_settings`. No other base-table access, no writes anywhere.
3. **Admin gated by `is_admin()`.** Writes and admin surfaces require
   `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`.
4. **Writes service-role-only.** All writes go via the service role or `SECURITY DEFINER` — never
   browser-side RLS writes.
5. **Turnstile server-side verify on the CV endpoint only** (`generate-cv`). Never on `chat` or
   `analyze-jd`; use per-IP rate limits there (ADR-0007).
6. **CORS allowlist.** Production domains + staging only. No wildcard.
7. **HSTS 180d.** `Strict-Transport-Security: max-age=15552000; includeSubDomains; preload`.
8. **Full header suite**, per-response CSP nonce, no `unsafe-inline`:
   - CSP without `'unsafe-inline'` in `script-src`; per-response nonce (16 random bytes, stamped
     via `router.options.ssr.nonce`, exposed to hydration through
     `<meta property="csp-nonce">`). `style-src 'unsafe-inline'` stays for React inline styles.
     Error pages are JS-free with `script-src 'self'`.
   - Verify the nonce actually matches the hydration scripts. A nonce that never matches means the
     CSP is bypassed or was relaxed.
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - `X-Frame-Options: SAMEORIGIN` on non-SSR/error responses.
9. **405/415 guards** on edge functions: wrong method → `405` + `Allow`; non-JSON body → `415`.
10. **Fail-closed SSR.** Unreachable Supabase → 5xx, no stale content served.
11. **No secrets in the browser bundle.** `.env.local` holds only public vars
    (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`) and is
    gitignored. Secrets go to Supabase secrets / Wrangler secrets. The DeepSeek key is read as the
    `deepseek` edge-function secret (`Deno.env.get("deepseek")`) and never shipped to the browser.
12. **Dependency + secret scanning in CI** — both, enabled and enforced, not optional.
13. **MFA on every platform account that deploys or holds secrets.**
14. **Abuse-watchdog** `abuse-alert` runs scheduled (every 15 min), counts only — never question
    text or PII.
15. **SVG out of the image bucket.** `kb-images` MIME allow-list `png/jpeg/webp/gif`; UUID
    filenames; sanitizer allow-list `<img>` http(s) only, no `data:` URIs.
16. **Legacy anon key disabled.**
17. **Signups restricted to your own email domain** (reference: `@zabrowski.pl`) via the
    `check_email_domain` trigger plus the `hook_restrict_signup_by_email_domain` auth hook.

| Control | Required state | Enforcement point |
|---|---|---|
| RLS | Enabled on all base tables | Postgres policies |
| anon reads | Views + `get_public_*` RPCs + public registries + `cv_settings` | Grants + policies |
| anon writes | Denied everywhere | Grants + deny policies |
| Admin | `is_admin()` | Policy qual |
| Turnstile | `generate-cv` only, server-side `siteverify` | Edge function |
| AI endpoints | Per-IP rate limits via `check_rate_limit` keyed on `cf-connecting-ip` | Edge function |
| CORS | Prod + staging allowlist | `_shared/http.ts` |
| Headers | Suite in item 8 | Worker SSR + non-SSR responses |
| Secrets | Server-side only | Supabase/Wrangler secrets |

### Recorded decisions and risk acceptances

| ADR | Record | Status |
|---|---|---|
| ADR-0007 | No Turnstile on `chat`/`analyze-jd`; per-IP rate limits instead | Decision |
| ADR-0008 | Free tier only | Risk acceptance |
| ADR-0009 | No MFA for the single-operator admin | Risk acceptance |

## 3. Admin-function authentication

Four admin edge functions: `generate-doc-content`, `generate-doc-tags`, `generate-faq-labels`,
`translate-recommendation`.

1. They deploy with `--no-verify-jwt`.
2. Therefore each must verify the caller's JWT **itself**: check presence AND signature via
   `auth.getUser()` against the service-role client. Decoding the JWT without verifying the
   signature is **NOT** authentication.
3. Behaviour contract, tested per function:

| Case | Expected |
|---|---|
| No `Authorization: Bearer` header | `401` |
| Tampered / forged token | `401` |
| Valid token of a non-admin user | `403` |
| Valid admin token | Works |

4. Gate: test all four cases for each of the four functions. See `DATABASE_SCHEMA.md` §9.

## 4. Final RLS audit

Audit the RLS model with SQL, never by eyeballing. Run the audit in `DATABASE_SCHEMA.md` **§12
(A–G)** before launch and after **every** schema change; the P2 owner of the split is
`references/schema/`. Expected output is the §10 matrix with zero deviations.

Assertions — all must hold:

1. RLS enabled on **all 21 tables** (§12 A).
2. anon/authenticated have **no base-table access** beyond the documented public reads:
   `site_sections`, `fun_links`, `holiday_banners`, `cv_settings` (§12 B).
3. The policy inventory (§12 F) shows **no permissive non-admin policy** on admin/private tables.
   `values_culture` / `faq_responses` / `ai_instructions` have no policy allowing `anon` or
   unrestricted `authenticated` reads; no `FOR SELECT TO anon USING (true)` on profile/content
   tables.
4. anon `INSERT`/`UPDATE`/`DELETE` **denied on every table** (§12 B, §12 G1).
5. `*_public` views are **read-only to API roles** — anon/authenticated/public write grants must
   return zero rows. Owner (`postgres`) and `service_role` write grants are expected, not findings
   (§12 C).
6. `EXECUTE` on cache/rate-limit RPCs (`check_rate_limit`, `get_chat_cache`, `set_chat_cache`,
   `get_jd_cache`, `set_jd_cache`, `insert_rag_metric`) granted to **no API role** — zero rows
   (§12 D).
7. Deny-all tables (`rate_limits`, `chat_response_cache`, `jd_analysis_cache`, `rag_metrics`,
   `cv_documents`) still deny: `cmd = 'ALL'`, `qual = false`, roles covering all roles
   (§12 E).
8. The authenticated non-admin probe (§12 G2) **fails** on private reads and admin writes, and
   **succeeds** on public views.
9. Service-role grants match the edge-function access matrix in `DATABASE_SCHEMA.md` §9.

Never revoke a "dead" anon grant without verifying every reader — grep the edge functions for the
table first. This exact mistake broke `generate-cv` once (`cv_settings`).

**Automation (pending).** `scripts/audit-rls.mjs` is intended to automate §12 B–G so the Phase 8
audit is one command. It is **not yet built**; until it lands, run the SQL by hand.

## 5. Verification checklist (run at end)

- [ ] `bun run typecheck && bun run lint && bun run test && bun run build` green
- [ ] **Final RLS audit passed** (`DATABASE_SCHEMA.md` §12 A–G) — RLS enabled on all 21 tables;
      policy inventory (F) has no permissive non-admin policy on admin/private tables;
      authenticated non-admin probe (G2) fails on private reads and admin writes; anon write denied
      on ALL tables; views read-only for API roles; RPC `EXECUTE` grants clean
- [ ] **Admin-function auth test passed** — all four admin edge functions: no token = `401`, forged
      token = `401`, non-admin token = `403`, admin token = works (signature-verified)
- [ ] **IP-header trust test** — spoofed `cf-connecting-ip` / `x-forwarded-for` does NOT bypass the
      rate limit on `chat`/`analyze-jd` (loop past the cap with rotating fake headers)
- [ ] **Prompt-injection test** — injected instructions in a JD / chat question do not leak the
      system prompt or private AI context
- [ ] **Sanitizer test** — `<script>`, `<img onerror=…>`, `javascript:` hrefs, `<iframe>` and
      `data:` URIs all stripped
- [ ] **No secret shapes in the bundle** — `sk-`, `sb_secret_`, Turnstile `0x3…` all absent from
      `dist/`
- [ ] Anon client: reads public views/RPCs, writes nothing
- [ ] Turnstile: missing token = `403`; dummy token = `invalid-input-response`; happy path OK
- [ ] AI endpoints: rate limit `429` after burst; input caps enforced; no key in browser bundle
- [ ] Content: hub + doc pages render from DB; admin WYSIWYG + images + related pages work;
      sanitizer strips disallowed markup
- [ ] Staging + prod both 200; staging noindex; `www` = 301 apex
- [ ] `llms.txt` / `llms-full.txt` / `sitemap.xml` / `robots.txt` / `openapi.json` 200
- [ ] Security headers live: CSP rotating `nonce-…`, no `'unsafe-inline'` in `script-src`; HSTS
      180d; `nosniff`; `Referrer-Policy`; `Permissions-Policy`; `X-Frame-Options` on non-SSR
      responses; the nonce actually matches the hydration scripts
- [ ] Edge functions: wrong method = `405` + `Allow`; non-JSON body = `415`
- [ ] CI: secret + dependency scanning enabled and enforced; no key material in git history
- [ ] No secrets in browser bundle; `.env.local` gitignored; nothing secret committed
- [ ] Backups configured and one restore tested (`supabase db dump` + Storage export)
- [ ] Layout per approved questionnaire — original unless user chose copy
- [ ] Docs + ADRs up to date

**Security self-test — final gate.** Run this yourself before reporting done; do not hand it to the
owner. It must PASS in full — any failure means the build is not done.

1. **RLS check (the security boundary).** Run `DATABASE_SCHEMA.md` §12 A–G (or
   `scripts/audit-rls.mjs` once it exists). Assert everything in section 4 above.
2. **Anon probe.** As a raw anon client, reads succeed on public views/RPCs and every write attempt
   returns a permission error.
3. **Admin-function auth.** Per admin function: no token = `401`, forged/tampered token = `401`,
   valid non-admin token = `403`, admin token = works.
4. **Secrets + bundle scan.** No secret-shaped strings in `dist/`; nothing secret in git history.

Report the result plainly: **PASS** (state what was verified, and counts) or list each deviation as
blocker/major/minor with its fix. Do not mark the build complete while step 1 or step 3 has a
failure.

## 6. Independent security review

Run a **FRESH session** (new conversation, no memory of the build) and copy-paste this brief:

```
You are an independent security reviewer with no memory of this build.
Read: the skill, DATABASE_SCHEMA.md §10 and §12, the security checklist,
and the code under review. Threat model: the RLS model is the security
boundary; rate limits/caps/caching/Turnstile are abuse controls only.
Re-run DATABASE_SCHEMA.md §12 queries A–G and the admin-function auth
tests (no token / forged token / non-admin token / admin token). Report
findings as a table: severity (blocker/major/minor/nit), location
(file + line/function), evidence, concrete fix. Do not modify anything.
```

1. Fix every finding before launch.
2. Record findings, compensating controls and risk acceptances (no MFA for single-operator admin —
   ADR-0009; free tier only — ADR-0008) in `docs/PROJECT_REFERENCE_ARCHITECTURE.md`,
   `docs/CI-CD-RULES.md` and new `adr/ADR-000N.md` records.

## Source map

| Section here | Old-kit source |
|---|---|
| 1. Threat model | `SKILL_INTERACTIVE_PORTFOLIO.md` "Non-negotiables" item 4 ("Threat model — read this once"); Phase 8 "Abuse vs attack — state it plainly"; `DATABASE_SCHEMA.md` §10 threat-model note |
| 2. Security defaults | `SKILL_INTERACTIVE_PORTFOLIO.md` "Non-negotiables" item 4; Phase 3 (RLS, storage, signup domain); Phase 6 (edge-function inventory, watchdog); Phase 8 security checklist; `GUIDE_FROM_SCRATCH.md` "Response headers (verify live)" / "Transmission security" |
| 3. Admin-function authentication | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 6 "Admin-function authentication" + Phase 8 admin-function auth test; `DATABASE_SCHEMA.md` §9 |
| 4. Final RLS audit | `DATABASE_SCHEMA.md` §10, §11 gate, §12 A–G; `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 "Final RLS audit" |
| 5. Verification checklist | `SKILL_INTERACTIVE_PORTFOLIO.md` "Verification checklist (run at end)" + "Security self-test — final gate" |
| 6. Independent security review | `SKILL_INTERACTIVE_PORTFOLIO.md` Phase 8 "Independent security review" |
